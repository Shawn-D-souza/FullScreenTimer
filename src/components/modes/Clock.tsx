import { useEffect, useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'

export function Clock() {
  const [time, setTime] = useState(new Date())
  const { clockSettings } = useStore()

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatter = useMemo(() => new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: clockSettings.showSeconds ? '2-digit' : undefined,
    hour12: !clockSettings.use24Hour,
  }), [clockSettings.showSeconds, clockSettings.use24Hour])

  // We only want the time string, not the AM/PM part necessarily, or maybe we do want AM/PM but smaller.
  // The minimalist way is to just display it exactly as formatted.
  const timeString = formatter.format(time)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-mono">
      <div className="text-[min(18vw,75vh)] leading-none font-bold tracking-tighter tabular-nums">
        {timeString}
      </div>
    </div>
  )
}
