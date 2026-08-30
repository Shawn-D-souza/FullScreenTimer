import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  cancelSound,
  hasScheduled,
  claimScheduled,
  playSound,
  resyncScheduled,
  scheduleSound,
} from '../lib/audio'
import { vibrate } from '../lib/haptics'
import { notify } from '../lib/notifications'
import * as ticker from '../lib/ticker'
import { formatCountdown, formatDurationWords } from '../lib/time'
import type { AlertProfile, Settings } from '../state/schema'
import { readSettings, useSettings } from '../state/settings'
import {
  PHASE_LABELS,
  onAlarm,
  pendingDeadlines,
  pomodoroPhaseDuration,
  useSession,
  type AlarmEvent,
} from '../state/session'
import { useUi } from '../state/ui'

/** Alarm keys are per mode, matching the pre-scheduled audio and ticker wake-ups. */
type AlarmKey = 'timer' | 'pomodoro' | 'flow'

interface Desired {
  at: number | null
  profile: AlertProfile | null
}

function profileFor(event: AlarmEvent, settings: Settings): AlertProfile {
  const { modes } = settings
  switch (event.type) {
    case 'timerEnd':
      return modes.timer.alerts.end
    case 'workEnd':
      return modes.pomodoro.alerts.workEnd
    case 'shortBreakEnd':
      return modes.pomodoro.alerts.shortBreakEnd
    case 'longBreakEnd':
      return modes.pomodoro.alerts.longBreakEnd
    case 'flowBreakStart':
      return modes.flowmodoro.alerts.breakStart
    case 'flowBreakEnd':
      return modes.flowmodoro.alerts.breakEnd
    case 'lap':
      return modes.stopwatch.alerts.lap
    case 'reset':
      return modes.stopwatch.alerts.reset
  }
}

function keyFor(event: AlarmEvent): AlarmKey | null {
  switch (event.type) {
    case 'timerEnd':
      return 'timer'
    case 'workEnd':
    case 'shortBreakEnd':
    case 'longBreakEnd':
      return 'pomodoro'
    case 'flowBreakEnd':
      return 'flow'
    default:
      // Laps, resets and break starts are immediate — nothing was pre-scheduled.
      return null
  }
}

interface Announcement {
  title: string
  body?: string
  /** What the screen reader hears; the tab title and hero cover everyone else. */
  live: string
}

function describe(event: AlarmEvent, settings: Settings): Announcement | null {
  const session = useSession.getState()

  switch (event.type) {
    case 'timerEnd': {
      const spoken = formatDurationWords(session.timer.durationMs)
      return { title: 'Timer finished', body: `${spoken} is up.`, live: 'Timer finished' }
    }

    case 'workEnd':
    case 'shortBreakEnd':
    case 'longBreakEnd': {
      // The session has already advanced, so the current phase is the next one.
      const next = session.pomodoro.phase
      const duration = pomodoroPhaseDuration(next, settings.modes.pomodoro)
      const ending =
        event.type === 'workEnd'
          ? 'Focus finished'
          : event.type === 'shortBreakEnd'
            ? 'Short break finished'
            : 'Long break finished'
      const nextLabel = `${PHASE_LABELS[next]} · ${formatCountdown(duration)}`
      return { title: ending, body: `Next: ${nextLabel}`, live: `${ending}. Next: ${nextLabel}` }
    }

    case 'flowBreakStart': {
      const focused = formatDurationWords(session.flow.lastFocusMs)
      const rest = formatDurationWords(session.flow.breakDurationMs)
      // The break may be waiting on a keypress rather than already counting down.
      const running = session.flow.breakStatus === 'running'
      return {
        title: `Break — ${rest}`,
        body: running ? `Earned by ${focused} of focus.` : `Earned by ${focused}. Press space to start.`,
        live: `${running ? 'Break started' : 'Break ready'}: ${rest} after ${focused} of focus`,
      }
    }

    case 'flowBreakEnd':
      return { title: 'Break finished', body: 'Start focusing when you are ready.', live: 'Break finished' }

    case 'lap':
    case 'reset':
      // Deliberately quiet: these are confirmations, not events worth a banner.
      return null
  }
}

/**
 * Wires deadlines to their consequences.
 *
 * The important half is pre-scheduling: as soon as a countdown starts, its tone is
 * queued on the audio thread for the exact instant it ends. That clock keeps
 * running when the tab is hidden and the JavaScript timers driving the display
 * have been throttled, which is what makes a background alarm trustworthy.
 */
export function useAlarmEngine(): void {
  const deadlines = useSession(useShallow((state) => pendingDeadlines(state)))
  const pomodoroPhase = useSession((state) => state.pomodoro.phase)
  const muted = useSettings((state) => state.general.globalMute)
  const timerAlert = useSettings((state) => state.modes.timer.alerts.end)
  const pomodoroAlerts = useSettings((state) => state.modes.pomodoro.alerts)
  const flowBreakEnd = useSettings((state) => state.modes.flowmodoro.alerts.breakEnd)

  const desired = useRef<Record<AlarmKey, Desired>>({
    timer: { at: null, profile: null },
    pomodoro: { at: null, profile: null },
    flow: { at: null, profile: null },
  })

  /* Drive the machine, and keep pre-scheduled audio honest. */
  useEffect(() => {
    const onTick = () => {
      useSession.getState().tick()
      resyncScheduled()

      // Audio cannot be scheduled until a gesture has unlocked the context, so
      // retry until it takes. Each call short-circuits when already scheduled.
      for (const key of Object.keys(desired.current) as AlarmKey[]) {
        const target = desired.current[key]
        if (target.at === null || target.profile === null) continue
        if (hasScheduled(key)) continue
        if (target.at - Date.now() < 300) continue
        scheduleSound(key, target.profile.sound, target.profile.volume, target.at)
      }
    }

    const unsubscribe = ticker.subscribe(onTick)
    onTick()
    return unsubscribe
  }, [])

  /* Keep the wake-ups and the queued tones in step with state and settings. */
  useEffect(() => {
    const plan: Record<AlarmKey, Desired> = {
      timer: { at: deadlines.timer, profile: muted ? null : timerAlert },
      pomodoro: {
        at: deadlines.pomodoro,
        profile: muted
          ? null
          : pomodoroPhase === 'work'
            ? pomodoroAlerts.workEnd
            : pomodoroPhase === 'shortBreak'
              ? pomodoroAlerts.shortBreakEnd
              : pomodoroAlerts.longBreakEnd,
      },
      flow: { at: deadlines.flow, profile: muted ? null : flowBreakEnd },
    }
    desired.current = plan

    for (const key of Object.keys(plan) as AlarmKey[]) {
      const { at, profile } = plan[key]
      ticker.wakeAt(key, at)
      if (at === null || profile === null) {
        cancelSound(key)
      } else {
        scheduleSound(key, profile.sound, profile.volume, at)
      }
    }

    // An auto-starting pomodoro phase needs a wake-up of its own.
    ticker.wakeAt('pomodoro-auto', deadlines.pomodoroAutoStart)

    return () => {
      for (const key of Object.keys(plan) as AlarmKey[]) {
        cancelSound(key)
        ticker.wakeAt(key, null)
      }
      ticker.wakeAt('pomodoro-auto', null)
    }
  }, [
    deadlines.timer,
    deadlines.pomodoro,
    deadlines.flow,
    deadlines.pomodoroAutoStart,
    pomodoroPhase,
    muted,
    timerAlert,
    pomodoroAlerts,
    flowBreakEnd,
  ])

  /* Turn events into sound, haptics, a notification and a calm visual pulse. */
  useEffect(
    () =>
      onAlarm((event) => {
        const settings = readSettings()
        const profile = profileFor(event, settings)
        const key = keyFor(event)
        const silenced = settings.general.globalMute || event.stale

        if (!silenced) {
          // If the audio thread already owns this tone, don't double it up.
          const alreadyPlaying = key !== null && claimScheduled(key, event.at)
          if (!alreadyPlaying) playSound(profile.sound, profile.volume)
          if (profile.vibration) vibrate(event.type)
        } else if (key !== null) {
          // Stop the queued tone before it reaches the speakers.
          cancelSound(key)
        }

        const announcement = describe(event, settings)
        if (!announcement) return

        const ui = useUi.getState()
        ui.announce(announcement.live)
        if (!event.stale) ui.flash()

        const notifiable =
          !settings.general.globalMute &&
          settings.notifications.master &&
          settings.notifications.perMode[event.mode]

        // A notification for something that finished an hour ago is just noise.
        if (notifiable && !event.stale) {
          notify({ title: announcement.title, body: announcement.body, tag: `fst-${event.mode}` })
        }
      }),
    [],
  )
}
