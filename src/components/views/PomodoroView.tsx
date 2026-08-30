import { cn } from '../../lib/cn'
import { SECOND, formatCountdown } from '../../lib/time'
import { useSettings } from '../../state/settings'
import { PHASE_LABELS, pomodoroRemaining, useSession } from '../../state/session'
import { useNow } from '../../hooks/useNow'
import { HeroDisplay } from '../HeroDisplay'

export function PomodoroView() {
  const pomodoro = useSession((state) => state.pomodoro)
  const rounds = useSettings((state) => state.modes.pomodoro.roundsBeforeLongBreak)
  const now = useNow(SECOND)

  const phase = PHASE_LABELS[pomodoro.phase]
  const pending = pomodoro.autoStartAt !== null
  const caption = pending
    ? `${phase} next`
    : pomodoro.status === 'paused'
      ? `${phase} · paused`
      : phase

  return (
    <HeroDisplay
      text={formatCountdown(pomodoroRemaining(pomodoro, now))}
      caption={caption}
      dim={pomodoro.status === 'paused'}
      meta={
        <RoundDots
          total={rounds}
          completed={pomodoro.completedInCycle}
          current={pomodoro.phase === 'work'}
        />
      }
    />
  )
}

/**
 * Rounds until the long break. Filled is done, ringed is in progress, hollow is
 * still to come — the whole cycle at a glance without a single number.
 */
function RoundDots({
  total,
  completed,
  current,
}: {
  total: number
  completed: number
  current: boolean
}) {
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={`Round ${Math.min(completed + 1, total)} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const done = index < completed
        const active = current && index === completed
        return (
          <span
            key={index}
            className={cn(
              'size-1.5 rounded-full border border-ink transition-opacity duration-300',
              done ? 'bg-ink opacity-100' : active ? 'opacity-100' : 'opacity-30',
            )}
          />
        )
      })}
    </div>
  )
}
