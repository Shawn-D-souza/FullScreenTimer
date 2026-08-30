import { useId, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '../../lib/cn'
import { MINUTE, SECOND, formatDurationWords } from '../../lib/time'
import { MODE_LABELS, normalizeOrder } from '../../state/schema'
import { useSettings } from '../../state/settings'
import { AlertRow, DurationField, MinutesField, NumberInput, Row, Section, Select, Toggle } from './controls'

const HOUR_FORMATS = [
  { value: 'inherit', label: 'Follow General' },
  { value: '24', label: '24-hour' },
  { value: '12', label: '12-hour' },
] as const

export function ModesSection() {
  return (
    <>
      <ModeList />
      <ClockSettings />
      <StopwatchSettings />
      <TimerSettings />
      <PomodoroSettings />
      <FlowmodoroSettings />
    </>
  )
}

/** Which modes exist, and in what order they cycle. */
function ModeList() {
  const order = useSettings(useShallow((state) => normalizeOrder(state.modes.order)))
  const enabled = useSettings((state) => state.modes.enabled)
  const setModeEnabled = useSettings((state) => state.setModeEnabled)
  const moveMode = useSettings((state) => state.moveMode)
  const enabledCount = order.filter((mode) => enabled[mode]).length

  return (
    <Section
      title="Modes"
      description="Turn off what you do not use and put the rest in the order you want to cycle through them. At least one has to stay on."
    >
      {order.map((mode, index) => (
        <div key={mode} className="rule-b flex items-center gap-4 py-3">
          <span className="chrome-label-sm w-5 shrink-0 opacity-30 tabular-nums">{index + 1}</span>
          <span className="flex-1 text-[0.875rem]">{MODE_LABELS[mode]}</span>

          <div className="flex items-center gap-0.5">
            <ReorderButton
              label={`Move ${MODE_LABELS[mode]} up`}
              disabled={index === 0}
              onClick={() => moveMode(mode, -1)}
            >
              <ChevronUp size={15} strokeWidth={1.5} />
            </ReorderButton>
            <ReorderButton
              label={`Move ${MODE_LABELS[mode]} down`}
              disabled={index === order.length - 1}
              onClick={() => moveMode(mode, 1)}
            >
              <ChevronDown size={15} strokeWidth={1.5} />
            </ReorderButton>
          </div>

          <Toggle
            label={`Enable ${MODE_LABELS[mode]}`}
            checked={enabled[mode]}
            disabled={enabled[mode] && enabledCount <= 1}
            onChange={(value) => setModeEnabled(mode, value)}
          />
        </div>
      ))}
    </Section>
  )
}

function ReorderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-7 place-items-center rounded-full opacity-45 transition-opacity',
        'hover:opacity-100 disabled:pointer-events-none disabled:opacity-10',
      )}
    >
      {children}
    </button>
  )
}

function ClockSettings() {
  const clock = useSettings((state) => state.modes.clock)
  const update = useSettings((state) => state.update)
  const formatId = useId()

  return (
    <Section title="Clock">
      <Row label="Show seconds">
        <Toggle
          label="Show seconds"
          checked={clock.showSeconds}
          onChange={(showSeconds) =>
            update((draft) => {
              draft.modes.clock.showSeconds = showSeconds
            })
          }
        />
      </Row>
      <Row label="Hour format" htmlFor={formatId}>
        <Select
          id={formatId}
          value={clock.hourFormat}
          options={HOUR_FORMATS}
          onChange={(hourFormat) =>
            update((draft) => {
              draft.modes.clock.hourFormat = hourFormat
            })
          }
        />
      </Row>
      <Row label="Show the date">
        <Toggle
          label="Show the date"
          checked={clock.showDate}
          onChange={(showDate) =>
            update((draft) => {
              draft.modes.clock.showDate = showDate
            })
          }
        />
      </Row>
    </Section>
  )
}

function StopwatchSettings() {
  const stopwatch = useSettings((state) => state.modes.stopwatch)
  const update = useSettings((state) => state.update)

  return (
    <Section title="Stopwatch">
      <Row label="Show hundredths" hint="Off makes the display calmer, and redraws it less often.">
        <Toggle
          label="Show hundredths"
          checked={stopwatch.centiseconds}
          onChange={(centiseconds) =>
            update((draft) => {
              draft.modes.stopwatch.centiseconds = centiseconds
            })
          }
        />
      </Row>
      <AlertRow
        label="Lap"
        profile={stopwatch.alerts.lap}
        onChange={(recipe) => update((draft) => recipe(draft.modes.stopwatch.alerts.lap))}
      />
      <AlertRow
        label="Reset"
        profile={stopwatch.alerts.reset}
        onChange={(recipe) => update((draft) => recipe(draft.modes.stopwatch.alerts.reset))}
      />
    </Section>
  )
}

function TimerSettings() {
  const timer = useSettings((state) => state.modes.timer)
  const update = useSettings((state) => state.update)

  return (
    <Section title="Timer">
      <Row label="Default duration" hint="What the timer shows when it is reset.">
        <DurationField
          ariaLabel="Default duration"
          ms={timer.defaultDurationMs}
          min={SECOND}
          max={24 * 60 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.timer.defaultDurationMs = ms
            })
          }
        />
      </Row>

      <Row label="Reset when finished" hint="Otherwise the timer sits at zero until you reset it.">
        <Toggle
          label="Reset when finished"
          checked={timer.autoReset}
          onChange={(autoReset) =>
            update((draft) => {
              draft.modes.timer.autoReset = autoReset
            })
          }
        />
      </Row>

      <Row label="Presets" hint="The one-tap durations under the timer." align="start">
        <div className="flex flex-col items-end gap-2">
          {timer.presetsMs.map((ms, index) => (
            <div key={`${index}-${ms}`} className="flex items-center gap-2">
              <DurationField
                ariaLabel={`Preset ${index + 1}`}
                ms={ms}
                min={SECOND}
                max={24 * 60 * MINUTE}
                onCommit={(next) =>
                  update((draft) => {
                    draft.modes.timer.presetsMs[index] = next
                  })
                }
              />
              <button
                type="button"
                aria-label={`Remove the ${formatDurationWords(ms)} preset`}
                disabled={timer.presetsMs.length <= 1}
                onClick={() =>
                  update((draft) => {
                    draft.modes.timer.presetsMs.splice(index, 1)
                  })
                }
                className="grid size-6 place-items-center rounded-full opacity-40 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-10"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
          ))}

          <button
            type="button"
            disabled={timer.presetsMs.length >= 8}
            onClick={() =>
              update((draft) => {
                const last = draft.modes.timer.presetsMs.at(-1) ?? 5 * MINUTE
                draft.modes.timer.presetsMs.push(Math.min(last + 5 * MINUTE, 24 * 60 * MINUTE))
              })
            }
            className="chrome-label-sm flex items-center gap-1.5 py-1 opacity-45 transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-15"
          >
            <Plus size={12} strokeWidth={1.5} />
            Add a preset
          </button>
        </div>
      </Row>

      <AlertRow
        label="Timer finished"
        profile={timer.alerts.end}
        onChange={(recipe) => update((draft) => recipe(draft.modes.timer.alerts.end))}
      />
    </Section>
  )
}

function PomodoroSettings() {
  const pomodoro = useSettings((state) => state.modes.pomodoro)
  const update = useSettings((state) => state.update)
  const roundsId = useId()

  return (
    <Section title="Pomodoro">
      <Row label="Focus">
        <MinutesField
          ariaLabel="Focus length"
          ms={pomodoro.workMs}
          min={MINUTE}
          max={8 * 60 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.pomodoro.workMs = ms
            })
          }
        />
      </Row>
      <Row label="Short break">
        <MinutesField
          ariaLabel="Short break length"
          ms={pomodoro.shortBreakMs}
          min={MINUTE}
          max={60 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.pomodoro.shortBreakMs = ms
            })
          }
        />
      </Row>
      <Row label="Long break">
        <MinutesField
          ariaLabel="Long break length"
          ms={pomodoro.longBreakMs}
          min={MINUTE}
          max={3 * 60 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.pomodoro.longBreakMs = ms
            })
          }
        />
      </Row>
      <Row label="Rounds before a long break" htmlFor={roundsId}>
        <NumberInput
          id={roundsId}
          value={pomodoro.roundsBeforeLongBreak}
          min={1}
          max={12}
          onCommit={(rounds) =>
            update((draft) => {
              draft.modes.pomodoro.roundsBeforeLongBreak = rounds
            })
          }
        />
      </Row>
      <Row label="Start breaks automatically">
        <Toggle
          label="Start breaks automatically"
          checked={pomodoro.autoStartBreaks}
          onChange={(value) =>
            update((draft) => {
              draft.modes.pomodoro.autoStartBreaks = value
            })
          }
        />
      </Row>
      <Row label="Start focus automatically" hint="Off is the honest default — a break should end when you say so.">
        <Toggle
          label="Start focus automatically"
          checked={pomodoro.autoStartWork}
          onChange={(value) =>
            update((draft) => {
              draft.modes.pomodoro.autoStartWork = value
            })
          }
        />
      </Row>

      <AlertRow
        label="Focus finished"
        profile={pomodoro.alerts.workEnd}
        onChange={(recipe) => update((draft) => recipe(draft.modes.pomodoro.alerts.workEnd))}
      />
      <AlertRow
        label="Short break finished"
        profile={pomodoro.alerts.shortBreakEnd}
        onChange={(recipe) => update((draft) => recipe(draft.modes.pomodoro.alerts.shortBreakEnd))}
      />
      <AlertRow
        label="Long break finished"
        profile={pomodoro.alerts.longBreakEnd}
        onChange={(recipe) => update((draft) => recipe(draft.modes.pomodoro.alerts.longBreakEnd))}
      />
    </Section>
  )
}

function FlowmodoroSettings() {
  const flow = useSettings((state) => state.modes.flowmodoro)
  const update = useSettings((state) => state.update)
  const divisorId = useId()

  return (
    <Section
      title="Flowmodoro"
      description="Focus for as long as it lasts, then take a break worth a fraction of it."
    >
      <Row
        label="Break divisor"
        hint={`Focused time ÷ ${flow.divisor}. An hour of focus earns ${formatDurationWords(
          (60 * MINUTE) / flow.divisor,
        )}.`}
        htmlFor={divisorId}
      >
        <NumberInput
          id={divisorId}
          value={flow.divisor}
          min={2}
          max={12}
          onCommit={(divisor) =>
            update((draft) => {
              draft.modes.flowmodoro.divisor = divisor
            })
          }
        />
      </Row>
      <Row label="Shortest break">
        <DurationField
          ariaLabel="Shortest break"
          ms={flow.minBreakMs}
          min={10 * SECOND}
          max={30 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.flowmodoro.minBreakMs = ms
            })
          }
        />
      </Row>
      <Row label="Longest break">
        <MinutesField
          ariaLabel="Longest break"
          ms={flow.maxBreakMs}
          min={MINUTE}
          max={3 * 60 * MINUTE}
          onCommit={(ms) =>
            update((draft) => {
              draft.modes.flowmodoro.maxBreakMs = ms
            })
          }
        />
      </Row>
      <Row label="Start the break automatically">
        <Toggle
          label="Start the break automatically"
          checked={flow.autoStartBreak}
          onChange={(value) =>
            update((draft) => {
              draft.modes.flowmodoro.autoStartBreak = value
            })
          }
        />
      </Row>

      <AlertRow
        label="Break earned"
        profile={flow.alerts.breakStart}
        onChange={(recipe) => update((draft) => recipe(draft.modes.flowmodoro.alerts.breakStart))}
      />
      <AlertRow
        label="Break finished"
        profile={flow.alerts.breakEnd}
        onChange={(recipe) => update((draft) => recipe(draft.modes.flowmodoro.alerts.breakEnd))}
      />
    </Section>
  )
}
