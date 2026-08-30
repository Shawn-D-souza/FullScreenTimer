/** Haptic patterns. Each alert has a recognisable rhythm so a mode can be identified without looking. */

export const VIBRATION_PATTERNS = {
  timerEnd: [220],
  workEnd: [180, 90, 180],
  shortBreakEnd: [140, 80, 140],
  longBreakEnd: [300, 120, 300, 120, 300],
  flowBreakStart: [120, 70, 240],
  flowBreakEnd: [180, 90, 180],
  lap: [30],
  reset: [60, 50, 60],
} as const

export type VibrationPatternId = keyof typeof VIBRATION_PATTERNS

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrate(pattern: VibrationPatternId): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate([...VIBRATION_PATTERNS[pattern]])
  } catch {
    /* some browsers expose the method but reject the call outside a gesture */
  }
}
