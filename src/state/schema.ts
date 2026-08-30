import { z } from 'zod'
import { SOUND_IDS, type SoundId } from '../lib/audio'
import { MINUTE, SECOND } from '../lib/time'

/* ---------------------------------------------------------------------------
 * Modes
 * ------------------------------------------------------------------------- */

export const MODE_IDS = ['timer', 'pomodoro', 'stopwatch', 'flowmodoro', 'clock'] as const
export type ModeId = (typeof MODE_IDS)[number]

/** Modes that can raise an alert, and therefore appear in the notification list. */
export const ALERTING_MODE_IDS = ['timer', 'pomodoro', 'stopwatch', 'flowmodoro'] as const
export type AlertingModeId = (typeof ALERTING_MODE_IDS)[number]

export const MODE_LABELS: Record<ModeId, string> = {
  timer: 'Timer',
  pomodoro: 'Pomodoro',
  stopwatch: 'Stopwatch',
  flowmodoro: 'Flowmodoro',
  clock: 'Clock',
}

export const DEFAULT_MODE_ORDER: ModeId[] = ['timer', 'pomodoro', 'stopwatch', 'flowmodoro', 'clock']

/* ---------------------------------------------------------------------------
 * Schema helpers
 *
 * Every leaf carries both a default and a catch. Settings live in a browser for
 * years across releases, so a value that has been renamed, hand-edited in
 * devtools, or written by an older build must degrade to its default rather than
 * take the whole tree — and the app — down with it.
 * ------------------------------------------------------------------------- */

function leaf<T extends z.ZodType>(schema: T, fallback: z.output<T>) {
  // The casts only silence zod's `NoUndefined<>` guard, which cannot see through
  // a generic parameter; `fallback` is already constrained to the output type.
  return schema.default(fallback as never).catch(fallback as never)
}

function group<T extends z.ZodRawShape>(shape: T) {
  const base = z.object(shape)
  return base.prefault({} as never).catch(() => base.parse({}) as never)
}

const positiveMs = (fallback: number, min: number, max: number) =>
  leaf(z.number().int().min(min).max(max), fallback)

/* ---------------------------------------------------------------------------
 * Alert profiles
 * ------------------------------------------------------------------------- */

const soundEnum = z.enum(SOUND_IDS)

interface AlertDefaults {
  sound: SoundId
  volume: number
  vibration: boolean
}

const alert = ({ sound, volume, vibration }: AlertDefaults) =>
  group({
    sound: leaf(soundEnum, sound),
    volume: leaf(z.number().min(0).max(1), volume),
    vibration: leaf(z.boolean(), vibration),
  })

export interface AlertProfile {
  sound: SoundId
  volume: number
  vibration: boolean
}

/* ---------------------------------------------------------------------------
 * The settings tree
 * ------------------------------------------------------------------------- */

export const IDLE_TIMEOUTS = [2000, 3000, 5000, 0] as const

export const SettingsSchema = group({
  general: group({
    theme: leaf(z.enum(['dark', 'light']), 'dark'),
    /** 0 means "never hide". */
    idleTimeoutMs: leaf(z.number().int().min(0).max(60_000), 3000),
    globalMute: leaf(z.boolean(), false),
    hour12: leaf(z.boolean(), false),
    chromePosition: leaf(z.enum(['bottom', 'top']), 'bottom'),
    heroScale: leaf(z.enum(['small', 'medium', 'large', 'huge']), 'medium'),
    /** `last` restores whatever mode was open when the app was closed. */
    startupMode: leaf(z.enum(['last', ...MODE_IDS]), 'last'),
    keepScreenAwake: leaf(z.boolean(), false),
    hideCursorWhenIdle: leaf(z.boolean(), true),
    tipsEnabled: leaf(z.boolean(), true),
  }),

  notifications: group({
    master: leaf(z.boolean(), true),
    perMode: group({
      timer: leaf(z.boolean(), true),
      pomodoro: leaf(z.boolean(), true),
      flowmodoro: leaf(z.boolean(), true),
      stopwatch: leaf(z.boolean(), false),
    }),
  }),

  modes: group({
    order: leaf(z.array(z.enum(MODE_IDS)), DEFAULT_MODE_ORDER),
    enabled: group({
      timer: leaf(z.boolean(), true),
      pomodoro: leaf(z.boolean(), true),
      stopwatch: leaf(z.boolean(), true),
      flowmodoro: leaf(z.boolean(), true),
      clock: leaf(z.boolean(), true),
    }),

    clock: group({
      showSeconds: leaf(z.boolean(), true),
      /** `inherit` follows General → time format. */
      hourFormat: leaf(z.enum(['inherit', '12', '24']), 'inherit'),
      showDate: leaf(z.boolean(), false),
    }),

    stopwatch: group({
      centiseconds: leaf(z.boolean(), true),
      alerts: group({
        lap: alert({ sound: 'block', volume: 0.4, vibration: true }),
        reset: alert({ sound: 'none', volume: 0.4, vibration: true }),
      }),
    }),

    timer: group({
      defaultDurationMs: positiveMs(5 * MINUTE, SECOND, 24 * 60 * MINUTE),
      autoReset: leaf(z.boolean(), false),
      presetsMs: leaf(
        z.array(z.number().int().min(SECOND).max(24 * 60 * MINUTE)).min(1).max(8),
        [5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 25 * MINUTE, 45 * MINUTE],
      ),
      alerts: group({
        end: alert({ sound: 'bell', volume: 0.7, vibration: true }),
      }),
    }),

    pomodoro: group({
      workMs: positiveMs(25 * MINUTE, MINUTE, 8 * 60 * MINUTE),
      shortBreakMs: positiveMs(5 * MINUTE, MINUTE, 60 * MINUTE),
      longBreakMs: positiveMs(20 * MINUTE, MINUTE, 3 * 60 * MINUTE),
      roundsBeforeLongBreak: leaf(z.number().int().min(1).max(12), 4),
      autoStartBreaks: leaf(z.boolean(), true),
      autoStartWork: leaf(z.boolean(), false),
      alerts: group({
        workEnd: alert({ sound: 'chime', volume: 0.7, vibration: true }),
        shortBreakEnd: alert({ sound: 'beep', volume: 0.6, vibration: true }),
        longBreakEnd: alert({ sound: 'ring', volume: 0.7, vibration: true }),
      }),
    }),

    flowmodoro: group({
      /** Break length is focused time ÷ divisor. */
      divisor: leaf(z.number().min(2).max(12), 5),
      minBreakMs: positiveMs(MINUTE, 10 * SECOND, 30 * MINUTE),
      maxBreakMs: positiveMs(30 * MINUTE, MINUTE, 3 * 60 * MINUTE),
      autoStartBreak: leaf(z.boolean(), true),
      alerts: group({
        breakStart: alert({ sound: 'pulse', volume: 0.6, vibration: true }),
        breakEnd: alert({ sound: 'chime', volume: 0.7, vibration: true }),
      }),
    }),
  }),
})

export type Settings = z.output<typeof SettingsSchema>
export type GeneralSettings = Settings['general']
export type PomodoroSettings = Settings['modes']['pomodoro']
export type FlowmodoroSettings = Settings['modes']['flowmodoro']

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({})

/** Guarantees exactly one entry per mode however mangled the stored array is. */
export function normalizeOrder(order: readonly ModeId[]): ModeId[] {
  const seen = new Set<ModeId>()
  const result: ModeId[] = []
  for (const id of order) {
    if (MODE_IDS.includes(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  for (const id of DEFAULT_MODE_ORDER) {
    if (!seen.has(id)) result.push(id)
  }
  return result
}

export function parseSettings(input: unknown): Settings {
  const parsed = SettingsSchema.parse(input ?? {})
  parsed.modes.order = normalizeOrder(parsed.modes.order)
  // At least one mode must stay enabled, per the PRD.
  if (!MODE_IDS.some((id) => parsed.modes.enabled[id])) {
    parsed.modes.enabled[DEFAULT_MODE_ORDER[0]] = true
  }
  return parsed
}

/** Resolves the clock's `inherit` option against the general time format. */
export function resolveHour12(settings: Settings): boolean {
  const override = settings.modes.clock.hourFormat
  if (override === '12') return true
  if (override === '24') return false
  return settings.general.hour12
}
