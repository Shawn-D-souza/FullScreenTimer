import * as RadixSlider from '@radix-ui/react-slider'
import * as RadixSwitch from '@radix-ui/react-switch'
import { Play } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { SOUND_IDS, SOUND_LABELS, playSound, unlockAudio, type SoundId } from '../../lib/audio'
import { MINUTE, SECOND, clamp, toMinutesSeconds } from '../../lib/time'
import { canVibrate } from '../../lib/haptics'
import type { AlertProfile } from '../../state/schema'

/* ---------------------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------------------- */

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="mb-12 last:mb-0">
      <h3 className="chrome-label mb-1">{title}</h3>
      {description ? (
        <p className="mb-4 max-w-prose text-[0.8125rem] leading-relaxed opacity-45">{description}</p>
      ) : null}
      <div className={cn('rule-t', description ? '' : 'mt-4')}>{children}</div>
    </section>
  )
}

export function Row({
  label,
  hint,
  htmlFor,
  children,
  align = 'center',
}: {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div
      className={cn(
        'rule-b flex flex-wrap justify-between gap-x-8 gap-y-2 py-3.5',
        align === 'center' ? 'items-center' : 'items-start',
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[0.875rem] leading-snug">
          {label}
        </label>
        {hint ? (
          <p className="mt-1 max-w-prose text-[0.75rem] leading-relaxed opacity-40">{hint}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Controls
 * ------------------------------------------------------------------------- */

export function Toggle({
  checked,
  onChange,
  id,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  id?: string
  label?: string
  disabled?: boolean
}) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'relative h-[18px] w-8 shrink-0 rounded-full border border-ink transition-colors duration-200',
        'data-[state=checked]:bg-ink disabled:opacity-25',
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block size-2.5 translate-x-[3px] rounded-full bg-ink transition-transform duration-200 ease-precise',
          'data-[state=checked]:translate-x-[17px] data-[state=checked]:bg-paper',
        )}
      />
    </RadixSwitch.Root>
  )
}

const INPUT_CLASS =
  'w-16 border-b border-ink/25 bg-transparent py-1 text-right text-[0.875rem] tabular-nums ' +
  'transition-colors focus:border-ink focus:outline-none'

/**
 * A number field that tolerates being typed into. The draft is local, so an
 * intermediate empty string or a half-finished number never reaches the store,
 * and the value is clamped once on commit rather than fighting the caret.
 */
export function NumberInput({
  value,
  min,
  max,
  step = 1,
  onCommit,
  suffix,
  id,
  ariaLabel,
  className,
}: {
  value: number
  min: number
  max: number
  step?: number
  onCommit: (value: number) => void
  suffix?: string
  id?: string
  ariaLabel?: string
  className?: string
}) {
  const [draft, setDraft] = useState(() => String(value))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setDraft(String(value))
  }, [value])

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <span className="flex items-baseline gap-1.5">
      <input
        id={id}
        aria-label={ariaLabel}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={() => {
          editing.current = true
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          editing.current = false
          commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(draft)
            event.currentTarget.blur()
          }
        }}
        className={cn(INPUT_CLASS, className)}
      />
      {suffix ? <span className="chrome-label-sm w-8 opacity-40">{suffix}</span> : null}
    </span>
  )
}

/** Whole minutes — right for everything but the timer, which wants seconds too. */
export function MinutesField({
  ms,
  min,
  max,
  onCommit,
  id,
  ariaLabel,
}: {
  ms: number
  min: number
  max: number
  onCommit: (ms: number) => void
  id?: string
  ariaLabel?: string
}) {
  return (
    <NumberInput
      id={id}
      ariaLabel={ariaLabel}
      value={Math.round(ms / MINUTE)}
      min={Math.max(1, Math.round(min / MINUTE))}
      max={Math.round(max / MINUTE)}
      onCommit={(minutes) => onCommit(clamp(minutes * MINUTE, min, max))}
      suffix="min"
    />
  )
}

export function DurationField({
  ms,
  min,
  max,
  onCommit,
  ariaLabel,
}: {
  ms: number
  min: number
  max: number
  onCommit: (ms: number) => void
  ariaLabel?: string
}) {
  const { minutes, seconds } = toMinutesSeconds(ms)
  const commit = (nextMinutes: number, nextSeconds: number) => {
    onCommit(clamp((nextMinutes * 60 + nextSeconds) * SECOND, min, max))
  }

  return (
    <span className="flex items-baseline gap-2">
      <NumberInput
        ariaLabel={ariaLabel ? `${ariaLabel} minutes` : 'Minutes'}
        value={minutes}
        min={0}
        max={Math.floor(max / MINUTE)}
        onCommit={(next) => commit(next, seconds)}
        suffix="min"
      />
      <NumberInput
        ariaLabel={ariaLabel ? `${ariaLabel} seconds` : 'Seconds'}
        value={seconds}
        min={0}
        max={59}
        step={5}
        onCommit={(next) => commit(minutes, next)}
        suffix="sec"
      />
    </span>
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  id,
  ariaLabel,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  id?: string
  ariaLabel?: string
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cn(
        'border-b border-ink/25 bg-transparent py-1 pr-1 text-[0.875rem]',
        'transition-colors focus:border-ink focus:outline-none',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function VolumeSlider({
  value,
  onChange,
  ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  ariaLabel: string
}) {
  return (
    <RadixSlider.Root
      value={[Math.round(value * 100)]}
      onValueChange={([next]) => onChange((next ?? 0) / 100)}
      min={0}
      max={100}
      step={5}
      aria-label={ariaLabel}
      className="relative flex h-5 w-28 touch-none items-center select-none"
    >
      <RadixSlider.Track className="relative h-px grow bg-ink/25">
        <RadixSlider.Range className="absolute h-px bg-ink" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className={cn(
          'block size-2.5 rounded-full bg-ink transition-transform',
          'hover:scale-125 focus-visible:scale-125 focus-visible:outline-none',
        )}
      />
    </RadixSlider.Root>
  )
}

const SOUND_OPTIONS = SOUND_IDS.map((id) => ({ value: id, label: SOUND_LABELS[id] }))

/**
 * Sound, volume and vibration for one event. Every change previews itself — the
 * only way to choose an alarm is to hear it.
 */
export function AlertRow({
  label,
  hint,
  profile,
  onChange,
}: {
  label: string
  hint?: string
  profile: AlertProfile
  onChange: (recipe: (draft: AlertProfile) => void) => void
}) {
  const id = useId()
  const preview = (sound: SoundId, volume: number) => {
    unlockAudio()
    playSound(sound, volume)
  }

  return (
    <Row label={label} hint={hint} htmlFor={id} align="start">
      <Select
        id={id}
        ariaLabel={`${label} sound`}
        value={profile.sound}
        options={SOUND_OPTIONS}
        onChange={(sound) => {
          onChange((draft) => {
            draft.sound = sound
          })
          preview(sound, profile.volume)
        }}
      />

      <VolumeSlider
        ariaLabel={`${label} volume`}
        value={profile.volume}
        onChange={(volume) => {
          onChange((draft) => {
            draft.volume = volume
          })
        }}
      />

      <button
        type="button"
        aria-label={`Preview ${label}`}
        title="Preview"
        onClick={() => preview(profile.sound, profile.volume)}
        disabled={profile.sound === 'none'}
        className="grid size-7 place-items-center rounded-full opacity-45 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-15"
      >
        <Play size={13} strokeWidth={1.5} />
      </button>

      {canVibrate() ? (
        <Toggle
          label={`${label} vibration`}
          checked={profile.vibration}
          onChange={(vibration) => {
            onChange((draft) => {
              draft.vibration = vibration
            })
          }}
        />
      ) : null}
    </Row>
  )
}
