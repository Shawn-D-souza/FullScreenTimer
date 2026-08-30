import { MINUTE, SECOND, formatClock, formatWeekday } from '../../lib/time'
import { resolveHour12 } from '../../state/schema'
import { useSettings } from '../../state/settings'
import { useNow } from '../../hooks/useNow'
import { HeroDisplay } from '../HeroDisplay'

export function ClockView() {
  const showSeconds = useSettings((state) => state.modes.clock.showSeconds)
  const showDate = useSettings((state) => state.modes.clock.showDate)
  const hour12 = useSettings(resolveHour12)

  // Without seconds there is nothing to redraw until the minute turns.
  const now = useNow(showSeconds ? SECOND : MINUTE)
  const { time, meridiem } = formatClock(now, hour12, showSeconds)

  return (
    <HeroDisplay
      text={time}
      suffix={meridiem}
      meta={
        showDate ? <span className="chrome-label opacity-45">{formatWeekday(now)}</span> : undefined
      }
    />
  )
}
