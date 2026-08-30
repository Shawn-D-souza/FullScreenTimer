export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pad(value: number, length = 2): string {
  return String(Math.floor(value)).padStart(length, '0')
}

/**
 * Advance widths of Inter's tabular figures, in em, already discounted by the
 * -0.035em tracking the hero applies. The hero derives its font size from this
 * so a countdown can never overflow the viewport or resize between ticks.
 */
const EM_WIDTHS: Record<string, number> = {
  '0': 0.57,
  '1': 0.57,
  '2': 0.57,
  '3': 0.57,
  '4': 0.57,
  '5': 0.57,
  '6': 0.57,
  '7': 0.57,
  '8': 0.57,
  '9': 0.57,
  ':': 0.27,
  '.': 0.27,
  ' ': 0.24,
  '−': 0.6,
  '-': 0.33,
}

export function heroEmWidth(text: string): number {
  let total = 0
  for (const char of text) total += EM_WIDTHS[char] ?? 0.57
  // Never divide by ~0 if a caller hands us an empty string.
  return Math.max(total, 1)
}

/** `05:00`, `25:00`, `1:05:00`. Minutes are always two digits so nothing jitters. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / SECOND))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

/** `00:00.00`, `12:34.56`, `1:02:03.45`. */
export function formatStopwatch(ms: number, centiseconds: boolean): string {
  const safe = Math.max(0, ms)
  const hours = Math.floor(safe / HOUR)
  const minutes = Math.floor((safe % HOUR) / MINUTE)
  const seconds = Math.floor((safe % MINUTE) / SECOND)
  const hundredths = Math.floor((safe % SECOND) / 10)

  const head = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
  return centiseconds ? `${head}.${pad(hundredths)}` : head
}

export interface ClockParts {
  time: string
  meridiem: 'AM' | 'PM' | null
}

export function formatClock(now: number, hour12: boolean, showSeconds: boolean): ClockParts {
  const date = new Date(now)
  const rawHours = date.getHours()
  const hours = hour12 ? rawHours % 12 || 12 : rawHours
  const time = showSeconds
    ? `${pad(hours)}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    : `${pad(hours)}:${pad(date.getMinutes())}`

  return { time, meridiem: hour12 ? (rawHours < 12 ? 'AM' : 'PM') : null }
}

export function formatWeekday(now: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(now))
}

/** Human phrasing for tips, notifications and settings summaries: `8 min`, `1 h 20 min`, `45 s`. */
export function formatDurationWords(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / SECOND))
  if (totalSeconds < 60) return `${totalSeconds} s`

  const totalMinutes = Math.round(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

/** Splits a duration for the two-field editors in settings. */
export function toMinutesSeconds(ms: number): { minutes: number; seconds: number } {
  const total = Math.max(0, Math.round(ms / SECOND))
  return { minutes: Math.floor(total / 60), seconds: total % 60 }
}

export function fromMinutesSeconds(minutes: number, seconds: number): number {
  return (Math.max(0, minutes) * 60 + Math.max(0, seconds)) * SECOND
}
