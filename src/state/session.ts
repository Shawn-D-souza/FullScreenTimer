import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { clamp, MINUTE } from '../lib/time'
import { readSettings, selectVisibleModes } from './settings'
import type { AlertingModeId, ModeId, PomodoroSettings } from './schema'

/* ---------------------------------------------------------------------------
 * Shapes
 *
 * Nothing counts. Every mode stores a deadline or a start instant and the display
 * is derived from `Date.now()`, so a throttled background tab, a sleeping laptop
 * or a closed-and-reopened app can never accumulate drift.
 * ------------------------------------------------------------------------- */

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished'
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'
export type FlowStage = 'focus' | 'break'

export interface StopwatchSession {
  running: boolean
  startedAt: number | null
  accumulated: number
  laps: number[]
}

export interface TimerSession {
  durationMs: number
  status: RunStatus
  endsAt: number | null
  remainingMs: number
}

export interface PomodoroSession {
  phase: PomodoroPhase
  /** Work sessions finished since the last long break. */
  completedInCycle: number
  /** Long breaks finished — purely informational. */
  cyclesCompleted: number
  status: RunStatus
  endsAt: number | null
  remainingMs: number
  /** Set when the next phase has been announced and will start on its own. */
  autoStartAt: number | null
}

export interface FlowSession {
  stage: FlowStage
  focusRunning: boolean
  focusStartedAt: number | null
  focusAccumulated: number
  lastFocusMs: number
  breakDurationMs: number
  breakStatus: RunStatus
  breakEndsAt: number | null
  breakRemainingMs: number
}

export type AlarmEventType =
  | 'timerEnd'
  | 'workEnd'
  | 'shortBreakEnd'
  | 'longBreakEnd'
  | 'flowBreakStart'
  | 'flowBreakEnd'
  | 'lap'
  | 'reset'

export interface AlarmEvent {
  type: AlarmEventType
  mode: AlertingModeId
  at: number
  /** True when the deadline passed while the app was closed or asleep. */
  stale: boolean
}

interface SessionData {
  activeMode: ModeId
  stopwatch: StopwatchSession
  timer: TimerSession
  pomodoro: PomodoroSession
  flow: FlowSession
}

interface SessionActions {
  setActiveMode: (mode: ModeId) => void
  cycleMode: (delta: 1 | -1) => void
  ensureValidMode: () => void
  applyStartupMode: () => void

  /** Space: the primary action for whichever mode is active. */
  toggle: () => void
  /** R: return the active mode to its starting state. */
  reset: () => void
  lap: () => void

  setTimerDuration: (ms: number) => void
  adjustTimerDuration: (deltaMs: number) => void
  startTimerWith: (ms: number) => void

  skipPhase: () => void
  endFocus: () => void

  /** Reconcile idle displays with settings the user just changed. */
  syncFromSettings: () => void
  /** Advance any deadline that has passed. Cheap no-op when nothing has. */
  tick: () => void
}

export type SessionStore = SessionData & SessionActions

/* ---------------------------------------------------------------------------
 * Constants
 * ------------------------------------------------------------------------- */

/** A deadline older than this passed while nobody was watching: advance, but stay quiet. */
const STALE_MS = 60_000
/** The next pomodoro phase is announced for this long before it starts itself. */
const ANNOUNCE_MS = 2500
const MAX_LAPS = 200

/* ---------------------------------------------------------------------------
 * Alarm channel
 *
 * A plain subscription rather than store state: alarms are events, not data, and
 * storing them would mean persisting and replaying them.
 * ------------------------------------------------------------------------- */

type AlarmListener = (event: AlarmEvent) => void
const alarmListeners = new Set<AlarmListener>()

export function onAlarm(listener: AlarmListener): () => void {
  alarmListeners.add(listener)
  return () => alarmListeners.delete(listener)
}

function emitAlarm(event: AlarmEvent): void {
  for (const listener of [...alarmListeners]) listener(event)
}

/* ---------------------------------------------------------------------------
 * Derivations — pure, so components can call them during render
 * ------------------------------------------------------------------------- */

export function stopwatchElapsed(session: StopwatchSession, now: number): number {
  const live = session.running && session.startedAt !== null ? now - session.startedAt : 0
  return Math.max(0, session.accumulated + live)
}

export function timerRemaining(session: TimerSession, now: number): number {
  if (session.status === 'running' && session.endsAt !== null) {
    return Math.max(0, session.endsAt - now)
  }
  return Math.max(0, session.remainingMs)
}

export function pomodoroRemaining(session: PomodoroSession, now: number): number {
  if (session.status === 'running' && session.endsAt !== null) {
    return Math.max(0, session.endsAt - now)
  }
  return Math.max(0, session.remainingMs)
}

export function flowFocusElapsed(session: FlowSession, now: number): number {
  const live = session.focusRunning && session.focusStartedAt !== null ? now - session.focusStartedAt : 0
  return Math.max(0, session.focusAccumulated + live)
}

export function flowBreakRemaining(session: FlowSession, now: number): number {
  if (session.breakStatus === 'running' && session.breakEndsAt !== null) {
    return Math.max(0, session.breakEndsAt - now)
  }
  return Math.max(0, session.breakRemainingMs)
}

export function pomodoroPhaseDuration(phase: PomodoroPhase, settings: PomodoroSettings): number {
  switch (phase) {
    case 'work':
      return settings.workMs
    case 'shortBreak':
      return settings.shortBreakMs
    case 'longBreak':
      return settings.longBreakMs
  }
}

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
}

/**
 * Every deadline the app is waiting on, whichever mode is on screen. Modes run
 * independently — leaving the stopwatch going while you watch the clock is
 * normal — so alarms are scheduled and fired per mode, not per active view.
 */
export interface PendingDeadlines {
  timer: number | null
  pomodoro: number | null
  pomodoroAutoStart: number | null
  flow: number | null
}

export function pendingDeadlines(state: SessionData): PendingDeadlines {
  return {
    timer: state.timer.status === 'running' ? state.timer.endsAt : null,
    pomodoro: state.pomodoro.status === 'running' ? state.pomodoro.endsAt : null,
    pomodoroAutoStart: state.pomodoro.status === 'idle' ? state.pomodoro.autoStartAt : null,
    flow:
      state.flow.stage === 'break' && state.flow.breakStatus === 'running'
        ? state.flow.breakEndsAt
        : null,
  }
}

export function pomodoroEndEvent(phase: PomodoroPhase): AlarmEventType {
  switch (phase) {
    case 'work':
      return 'workEnd'
    case 'shortBreak':
      return 'shortBreakEnd'
    case 'longBreak':
      return 'longBreakEnd'
  }
}

/* ---------------------------------------------------------------------------
 * Initial state
 * ------------------------------------------------------------------------- */

function initialData(): SessionData {
  const settings = readSettings()
  return {
    activeMode: selectVisibleModes(settings)[0],
    stopwatch: { running: false, startedAt: null, accumulated: 0, laps: [] },
    timer: {
      durationMs: settings.modes.timer.defaultDurationMs,
      status: 'idle',
      endsAt: null,
      remainingMs: settings.modes.timer.defaultDurationMs,
    },
    pomodoro: {
      phase: 'work',
      completedInCycle: 0,
      cyclesCompleted: 0,
      status: 'idle',
      endsAt: null,
      remainingMs: settings.modes.pomodoro.workMs,
      autoStartAt: null,
    },
    flow: {
      stage: 'focus',
      focusRunning: false,
      focusStartedAt: null,
      focusAccumulated: 0,
      lastFocusMs: 0,
      breakDurationMs: 0,
      breakStatus: 'idle',
      breakEndsAt: null,
      breakRemainingMs: 0,
    },
  }
}

function hasCrossing(state: SessionData, now: number): boolean {
  const { timer, pomodoro, flow } = state
  if (timer.status === 'running' && timer.endsAt !== null && now >= timer.endsAt) return true
  if (pomodoro.status === 'running' && pomodoro.endsAt !== null && now >= pomodoro.endsAt) return true
  if (pomodoro.status === 'idle' && pomodoro.autoStartAt !== null && now >= pomodoro.autoStartAt) {
    return true
  }
  if (
    flow.stage === 'break' &&
    flow.breakStatus === 'running' &&
    flow.breakEndsAt !== null &&
    now >= flow.breakEndsAt
  ) {
    return true
  }
  return false
}

/* ---------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

export const useSession = create<SessionStore>()(
  persist(
    immer<SessionStore>((set, get) => ({
      ...initialData(),

      setActiveMode: (mode) =>
        set((state) => {
          state.activeMode = mode
        }),

      cycleMode: (delta) =>
        set((state) => {
          const visible = selectVisibleModes(readSettings())
          const index = visible.indexOf(state.activeMode)
          const from = index === -1 ? 0 : index
          state.activeMode = visible[(from + delta + visible.length) % visible.length]
        }),

      ensureValidMode: () =>
        set((state) => {
          const visible = selectVisibleModes(readSettings())
          if (!visible.includes(state.activeMode)) state.activeMode = visible[0]
        }),

      applyStartupMode: () =>
        set((state) => {
          const settings = readSettings()
          const visible = selectVisibleModes(settings)
          const preferred = settings.general.startupMode
          if (preferred !== 'last' && visible.includes(preferred)) {
            state.activeMode = preferred
          } else if (!visible.includes(state.activeMode)) {
            state.activeMode = visible[0]
          }
        }),

      toggle: () => {
        const now = Date.now()
        const settings = readSettings()
        let startedFlowBreak = false

        set((state) => {
          switch (state.activeMode) {
            case 'clock':
              break

            case 'stopwatch': {
              const sw = state.stopwatch
              if (sw.running) {
                sw.accumulated = stopwatchElapsed(sw, now)
                sw.running = false
                sw.startedAt = null
              } else {
                sw.running = true
                sw.startedAt = now
              }
              break
            }

            case 'timer': {
              const timer = state.timer
              if (timer.status === 'running') {
                timer.remainingMs = timerRemaining(timer, now)
                timer.status = 'paused'
                timer.endsAt = null
              } else if (timer.status === 'finished') {
                timer.remainingMs = timer.durationMs
                timer.endsAt = now + timer.durationMs
                timer.status = 'running'
              } else {
                const remaining = timer.remainingMs > 0 ? timer.remainingMs : timer.durationMs
                timer.remainingMs = remaining
                timer.endsAt = now + remaining
                timer.status = 'running'
              }
              break
            }

            case 'pomodoro': {
              const pom = state.pomodoro
              if (pom.status === 'running') {
                pom.remainingMs = pomodoroRemaining(pom, now)
                pom.status = 'paused'
                pom.endsAt = null
              } else {
                // Starting by hand cancels a pending announcement.
                pom.autoStartAt = null
                const remaining =
                  pom.remainingMs > 0
                    ? pom.remainingMs
                    : pomodoroPhaseDuration(pom.phase, settings.modes.pomodoro)
                pom.remainingMs = remaining
                pom.endsAt = now + remaining
                pom.status = 'running'
              }
              break
            }

            case 'flowmodoro': {
              const flow = state.flow
              if (flow.stage === 'focus') {
                if (flow.focusRunning) {
                  // Losing focus is the signal to take a break.
                  const focused = flowFocusElapsed(flow, now)
                  const config = settings.modes.flowmodoro
                  const breakMs = clamp(
                    Math.round(focused / config.divisor),
                    config.minBreakMs,
                    config.maxBreakMs,
                  )
                  flow.focusRunning = false
                  flow.focusStartedAt = null
                  flow.focusAccumulated = focused
                  flow.lastFocusMs = focused
                  flow.stage = 'break'
                  flow.breakDurationMs = breakMs
                  flow.breakRemainingMs = breakMs
                  if (config.autoStartBreak) {
                    flow.breakStatus = 'running'
                    flow.breakEndsAt = now + breakMs
                  } else {
                    flow.breakStatus = 'idle'
                    flow.breakEndsAt = null
                  }
                  startedFlowBreak = true
                } else {
                  flow.focusRunning = true
                  flow.focusStartedAt = now
                }
              } else if (flow.breakStatus === 'running') {
                flow.breakRemainingMs = flowBreakRemaining(flow, now)
                flow.breakStatus = 'paused'
                flow.breakEndsAt = null
              } else if (flow.breakStatus === 'finished') {
                flow.stage = 'focus'
                flow.focusRunning = true
                flow.focusStartedAt = now
                flow.focusAccumulated = 0
                flow.breakStatus = 'idle'
                flow.breakEndsAt = null
                flow.breakRemainingMs = 0
              } else {
                const remaining =
                  flow.breakRemainingMs > 0 ? flow.breakRemainingMs : flow.breakDurationMs
                flow.breakRemainingMs = remaining
                flow.breakEndsAt = now + remaining
                flow.breakStatus = 'running'
              }
              break
            }
          }
        })

        // A break that has just been calculated deserves its own announcement.
        if (startedFlowBreak) {
          emitAlarm({ type: 'flowBreakStart', mode: 'flowmodoro', at: now, stale: false })
        }
      },

      reset: () => {
        const now = Date.now()
        const settings = readSettings()
        const mode = get().activeMode
        let hadStopwatchState = false

        set((state) => {
          switch (state.activeMode) {
            case 'clock':
              break

            case 'stopwatch': {
              hadStopwatchState =
                state.stopwatch.running ||
                state.stopwatch.accumulated > 0 ||
                state.stopwatch.laps.length > 0
              state.stopwatch = { running: false, startedAt: null, accumulated: 0, laps: [] }
              break
            }

            case 'timer': {
              const duration = state.timer.durationMs
              state.timer = {
                durationMs: duration,
                status: 'idle',
                endsAt: null,
                remainingMs: duration,
              }
              break
            }

            case 'pomodoro': {
              state.pomodoro = {
                phase: 'work',
                completedInCycle: 0,
                cyclesCompleted: state.pomodoro.cyclesCompleted,
                status: 'idle',
                endsAt: null,
                remainingMs: settings.modes.pomodoro.workMs,
                autoStartAt: null,
              }
              break
            }

            case 'flowmodoro': {
              state.flow = {
                stage: 'focus',
                focusRunning: false,
                focusStartedAt: null,
                focusAccumulated: 0,
                lastFocusMs: 0,
                breakDurationMs: 0,
                breakStatus: 'idle',
                breakEndsAt: null,
                breakRemainingMs: 0,
              }
              break
            }
          }
        })

        if (mode === 'stopwatch' && hadStopwatchState) {
          emitAlarm({ type: 'reset', mode: 'stopwatch', at: now, stale: false })
        }
      },

      lap: () => {
        const now = Date.now()
        let recorded = false

        set((state) => {
          const sw = state.stopwatch
          if (!sw.running) return
          const elapsed = stopwatchElapsed(sw, now)
          if (elapsed <= 0) return
          sw.laps.unshift(elapsed)
          if (sw.laps.length > MAX_LAPS) sw.laps.length = MAX_LAPS
          recorded = true
        })

        if (recorded) emitAlarm({ type: 'lap', mode: 'stopwatch', at: now, stale: false })
      },

      setTimerDuration: (ms) =>
        set((state) => {
          const duration = clamp(Math.round(ms), 1000, 24 * 60 * MINUTE)
          state.timer.durationMs = duration
          if (state.timer.status !== 'running') {
            state.timer.status = 'idle'
            state.timer.endsAt = null
            state.timer.remainingMs = duration
          }
        }),

      adjustTimerDuration: (deltaMs) =>
        set((state) => {
          if (state.timer.status === 'running') return
          const base = state.timer.remainingMs > 0 ? state.timer.remainingMs : state.timer.durationMs
          // Snap to the delta's grid so repeated presses land on round numbers.
          const grid = Math.abs(deltaMs)
          const snapped =
            deltaMs > 0 ? Math.floor(base / grid) * grid + grid : Math.ceil(base / grid) * grid - grid
          const next = clamp(snapped, 1000, 24 * 60 * MINUTE)
          state.timer.durationMs = next
          state.timer.status = 'idle'
          state.timer.endsAt = null
          state.timer.remainingMs = next
        }),

      startTimerWith: (ms) =>
        set((state) => {
          const duration = clamp(Math.round(ms), 1000, 24 * 60 * MINUTE)
          const now = Date.now()
          state.activeMode = 'timer'
          state.timer.durationMs = duration
          state.timer.remainingMs = duration
          state.timer.endsAt = now + duration
          state.timer.status = 'running'
        }),

      skipPhase: () => {
        const settings = readSettings()
        set((state) => {
          if (state.activeMode !== 'pomodoro') return
          const pom = state.pomodoro
          advancePomodoro(pom, settings.modes.pomodoro)
          pom.status = 'idle'
          pom.endsAt = null
          pom.autoStartAt = null
          pom.remainingMs = pomodoroPhaseDuration(pom.phase, settings.modes.pomodoro)
        })
      },

      endFocus: () => {
        const state = get()
        if (state.activeMode !== 'flowmodoro') return
        if (state.flow.stage !== 'focus' || !state.flow.focusRunning) return
        get().toggle()
      },

      syncFromSettings: () =>
        set((state) => {
          const settings = readSettings()

          if (state.timer.status === 'idle') {
            state.timer.durationMs = settings.modes.timer.defaultDurationMs
            state.timer.remainingMs = settings.modes.timer.defaultDurationMs
          }

          const pom = state.pomodoro
          if (pom.completedInCycle > settings.modes.pomodoro.roundsBeforeLongBreak) {
            pom.completedInCycle = settings.modes.pomodoro.roundsBeforeLongBreak
          }
          if (pom.status === 'idle' && pom.autoStartAt === null) {
            pom.remainingMs = pomodoroPhaseDuration(pom.phase, settings.modes.pomodoro)
          }

          if (state.flow.stage === 'break' && state.flow.breakStatus === 'idle') {
            const config = settings.modes.flowmodoro
            if (state.flow.lastFocusMs > 0) {
              const breakMs = clamp(
                Math.round(state.flow.lastFocusMs / config.divisor),
                config.minBreakMs,
                config.maxBreakMs,
              )
              state.flow.breakDurationMs = breakMs
              state.flow.breakRemainingMs = breakMs
            }
          }
        }),

      tick: () => {
        const now = Date.now()
        if (!hasCrossing(get(), now)) return

        const settings = readSettings()
        const events: AlarmEvent[] = []

        set((state) => {
          const { timer, pomodoro, flow } = state

          if (timer.status === 'running' && timer.endsAt !== null && now >= timer.endsAt) {
            const deadline = timer.endsAt
            const stale = now - deadline > STALE_MS
            timer.status = 'finished'
            timer.endsAt = null
            timer.remainingMs = 0
            events.push({ type: 'timerEnd', mode: 'timer', at: deadline, stale })

            if (settings.modes.timer.autoReset) {
              timer.status = 'idle'
              timer.remainingMs = timer.durationMs
            }
          }

          if (pomodoro.status === 'running' && pomodoro.endsAt !== null && now >= pomodoro.endsAt) {
            const deadline = pomodoro.endsAt
            const stale = now - deadline > STALE_MS
            const ending = pomodoro.phase
            events.push({
              type:
                ending === 'work' ? 'workEnd' : ending === 'shortBreak' ? 'shortBreakEnd' : 'longBreakEnd',
              mode: 'pomodoro',
              at: deadline,
              stale,
            })

            advancePomodoro(pomodoro, settings.modes.pomodoro)
            pomodoro.status = 'idle'
            pomodoro.endsAt = null
            pomodoro.remainingMs = pomodoroPhaseDuration(pomodoro.phase, settings.modes.pomodoro)

            const autoStart =
              pomodoro.phase === 'work'
                ? settings.modes.pomodoro.autoStartWork
                : settings.modes.pomodoro.autoStartBreaks
            // Never auto-start something the user was not present for.
            pomodoro.autoStartAt = autoStart && !stale ? now + ANNOUNCE_MS : null
          }

          if (
            pomodoro.status === 'idle' &&
            pomodoro.autoStartAt !== null &&
            now >= pomodoro.autoStartAt
          ) {
            pomodoro.autoStartAt = null
            pomodoro.status = 'running'
            pomodoro.endsAt = now + pomodoro.remainingMs
          }

          if (
            flow.stage === 'break' &&
            flow.breakStatus === 'running' &&
            flow.breakEndsAt !== null &&
            now >= flow.breakEndsAt
          ) {
            const deadline = flow.breakEndsAt
            events.push({
              type: 'flowBreakEnd',
              mode: 'flowmodoro',
              at: deadline,
              stale: now - deadline > STALE_MS,
            })
            flow.breakStatus = 'finished'
            flow.breakEndsAt = null
            flow.breakRemainingMs = 0
          }
        })

        for (const event of events) emitAlarm(event)
      },
    })),
    {
      name: 'fst:session',
      version: 1,
      partialize: (state) => ({
        activeMode: state.activeMode,
        stopwatch: state.stopwatch,
        timer: state.timer,
        pomodoro: state.pomodoro,
        flow: state.flow,
      }),
      merge: (persisted, current) => mergeSession(persisted, current),
    },
  ),
)

function advancePomodoro(session: PomodoroSession, settings: PomodoroSettings): void {
  switch (session.phase) {
    case 'work': {
      session.completedInCycle += 1
      session.phase =
        session.completedInCycle >= settings.roundsBeforeLongBreak ? 'longBreak' : 'shortBreak'
      break
    }
    case 'shortBreak': {
      session.phase = 'work'
      break
    }
    case 'longBreak': {
      session.phase = 'work'
      session.completedInCycle = 0
      session.cyclesCompleted += 1
      break
    }
  }
}

/**
 * Restores a session written by any earlier build. Anything unrecognised is
 * dropped in favour of a fresh sub-session rather than trusted.
 */
function mergeSession(persisted: unknown, current: SessionStore): SessionStore {
  const fresh = initialData()
  if (typeof persisted !== 'object' || persisted === null) return { ...current, ...fresh }

  const raw = persisted as Partial<SessionData>
  const merged: SessionData = {
    activeMode: fresh.activeMode,
    stopwatch: isStopwatch(raw.stopwatch) ? raw.stopwatch : fresh.stopwatch,
    timer: isTimer(raw.timer) ? raw.timer : fresh.timer,
    pomodoro: isPomodoro(raw.pomodoro) ? raw.pomodoro : fresh.pomodoro,
    flow: isFlow(raw.flow) ? raw.flow : fresh.flow,
  }

  if (typeof raw.activeMode === 'string') {
    const visible = selectVisibleModes(readSettings())
    if (visible.includes(raw.activeMode as ModeId)) merged.activeMode = raw.activeMode as ModeId
  }

  return { ...current, ...merged }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStopwatch(value: unknown): value is StopwatchSession {
  return (
    isRecord(value) &&
    typeof value.running === 'boolean' &&
    typeof value.accumulated === 'number' &&
    Array.isArray(value.laps)
  )
}

function isTimer(value: unknown): value is TimerSession {
  return (
    isRecord(value) &&
    typeof value.durationMs === 'number' &&
    typeof value.remainingMs === 'number' &&
    typeof value.status === 'string'
  )
}

function isPomodoro(value: unknown): value is PomodoroSession {
  return (
    isRecord(value) &&
    typeof value.phase === 'string' &&
    typeof value.completedInCycle === 'number' &&
    typeof value.remainingMs === 'number' &&
    typeof value.status === 'string'
  )
}

function isFlow(value: unknown): value is FlowSession {
  return (
    isRecord(value) &&
    typeof value.stage === 'string' &&
    typeof value.focusAccumulated === 'number' &&
    typeof value.breakRemainingMs === 'number'
  )
}
