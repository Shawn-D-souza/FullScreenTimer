import { useEffect } from 'react'
import { now, subscribe } from '../lib/ticker'
import { formatCountdown, formatStopwatch } from '../lib/time'
import {
  PHASE_LABELS,
  flowBreakRemaining,
  flowFocusElapsed,
  pomodoroRemaining,
  stopwatchElapsed,
  timerRemaining,
  useSession,
  type SessionStore,
} from '../state/session'

const BASE_TITLE = 'FullScreenTimer'

/**
 * What the tab should say. The active mode wins, but a countdown running in
 * another mode is worth more than the name of the app — that countdown is
 * precisely the thing the user switched away to stop watching.
 */
function describe(state: SessionStore, now: number): string | null {
  const order =
    state.activeMode === 'clock'
      ? (['timer', 'pomodoro', 'flowmodoro', 'stopwatch'] as const)
      : ([state.activeMode, 'timer', 'pomodoro', 'flowmodoro', 'stopwatch'] as const)

  for (const mode of order) {
    switch (mode) {
      case 'timer': {
        const { status } = state.timer
        if (status === 'finished') return `Time is up — Timer`
        if (status === 'running') return `${formatCountdown(timerRemaining(state.timer, now))} — Timer`
        if (status === 'paused') {
          return `Paused · ${formatCountdown(timerRemaining(state.timer, now))} — Timer`
        }
        break
      }

      case 'pomodoro': {
        const { status, phase } = state.pomodoro
        const label = PHASE_LABELS[phase]
        if (state.pomodoro.autoStartAt !== null) return `${label} next — Pomodoro`
        if (status === 'running') {
          return `${formatCountdown(pomodoroRemaining(state.pomodoro, now))} — ${label}`
        }
        if (status === 'paused') {
          return `Paused · ${formatCountdown(pomodoroRemaining(state.pomodoro, now))} — ${label}`
        }
        break
      }

      case 'flowmodoro': {
        const { stage, focusRunning, breakStatus } = state.flow
        if (stage === 'focus' && focusRunning) {
          return `${formatStopwatch(flowFocusElapsed(state.flow, now), false)} — Flow`
        }
        if (stage === 'break') {
          const remaining = formatCountdown(flowBreakRemaining(state.flow, now))
          if (breakStatus === 'running') return `${remaining} — Break`
          if (breakStatus === 'paused') return `Paused · ${remaining} — Break`
          if (breakStatus === 'idle') return `Break ready — Flow`
          return `Break over — Flow`
        }
        break
      }

      case 'stopwatch': {
        if (state.stopwatch.running) {
          return `${formatStopwatch(stopwatchElapsed(state.stopwatch, now), false)} — Stopwatch`
        }
        break
      }
    }
  }

  return null
}

/**
 * Mirrors the live session into the tab title.
 *
 * Deliberately imperative: driving this through React state would re-render the
 * tree once a second for a string nothing on screen depends on. `describe` is a
 * handful of string operations, and the assignment is skipped unless the text
 * actually changed.
 */
export function useDocumentTitle(): void {
  useEffect(() => {
    let last = ''

    const apply = () => {
      const text = describe(useSession.getState(), now()) ?? BASE_TITLE
      if (text === last) return
      last = text
      document.title = text
    }

    apply()
    const unsubscribeTicker = subscribe(apply)
    const unsubscribeSession = useSession.subscribe(apply)
    return () => {
      unsubscribeTicker()
      unsubscribeSession()
    }
  }, [])
}
