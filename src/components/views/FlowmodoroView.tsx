import { SECOND, clamp, formatCountdown, formatDurationWords, formatStopwatch } from '../../lib/time'
import { useSettings } from '../../state/settings'
import { flowBreakRemaining, flowFocusElapsed, useSession } from '../../state/session'
import { useNow } from '../../hooks/useNow'
import { HeroDisplay } from '../HeroDisplay'

export function FlowmodoroView() {
  const flow = useSession((state) => state.flow)
  const config = useSettings((state) => state.modes.flowmodoro)
  const now = useNow(SECOND)

  if (flow.stage === 'focus') {
    const elapsed = flowFocusElapsed(flow, now)
    // The break being earned, shown as it is earned — the whole point of the mode.
    const earned = clamp(Math.round(elapsed / config.divisor), config.minBreakMs, config.maxBreakMs)

    return (
      <HeroDisplay
        text={formatStopwatch(elapsed, false)}
        caption={flow.focusRunning ? 'Focus' : elapsed > 0 ? 'Focus · paused' : 'Focus'}
        dim={!flow.focusRunning && elapsed > 0}
        meta={
          <span className="chrome-label opacity-45">
            {elapsed > 0 ? `Break earned · ${formatDurationWords(earned)}` : 'Break earned as you focus'}
          </span>
        }
      />
    )
  }

  const remaining = flowBreakRemaining(flow, now)
  const caption =
    flow.breakStatus === 'finished'
      ? 'Break over'
      : flow.breakStatus === 'paused'
        ? 'Break · paused'
        : flow.breakStatus === 'idle'
          ? 'Break ready'
          : 'Break'

  return (
    <HeroDisplay
      text={formatCountdown(remaining)}
      caption={caption}
      dim={flow.breakStatus === 'paused' || flow.breakStatus === 'idle'}
      meta={
        <span className="chrome-label opacity-45">
          {`Earned by ${formatDurationWords(flow.lastFocusMs)} of focus`}
        </span>
      }
    />
  )
}
