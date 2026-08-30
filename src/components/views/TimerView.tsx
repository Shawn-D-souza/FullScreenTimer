import { SECOND, formatCountdown } from '../../lib/time'
import { timerRemaining, useSession } from '../../state/session'
import { useNow } from '../../hooks/useNow'
import { HeroDisplay } from '../HeroDisplay'

export function TimerView() {
  const timer = useSession((state) => state.timer)
  const now = useNow(SECOND)
  const remaining = timerRemaining(timer, now)

  const caption =
    timer.status === 'paused' ? 'Paused' : timer.status === 'finished' ? 'Time is up' : undefined

  return (
    <HeroDisplay text={formatCountdown(remaining)} caption={caption} dim={timer.status === 'paused'} />
  )
}
