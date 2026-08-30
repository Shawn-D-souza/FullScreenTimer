import { useId } from 'react'
import { IDLE_TIMEOUTS, MODE_IDS, MODE_LABELS } from '../../state/schema'
import { useSettings } from '../../state/settings'
import { notificationPermission } from '../../lib/notifications'
import { isStandalone, supportsWakeLock } from '../../lib/pwa'
import { Row, Section, Select, Toggle } from './controls'

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const

const SCALES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge' },
] as const

const POSITIONS = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'top', label: 'Top' },
] as const

const FORMATS = [
  { value: '24', label: '24-hour' },
  { value: '12', label: '12-hour' },
] as const

const IDLE_LABELS: Record<(typeof IDLE_TIMEOUTS)[number], string> = {
  2000: '2 seconds',
  3000: '3 seconds',
  5000: '5 seconds',
  0: 'Never hide',
}

const STARTUP = [
  { value: 'last', label: 'Where I left off' },
  ...MODE_IDS.map((id) => ({ value: id, label: MODE_LABELS[id] })),
] as const

export function GeneralSection() {
  const general = useSettings((state) => state.general)
  const update = useSettings((state) => state.update)
  const ids = {
    theme: useId(),
    scale: useId(),
    position: useId(),
    idle: useId(),
    format: useId(),
    startup: useId(),
  }

  return (
    <>
      <Section title="Appearance">
        <Row label="Theme" htmlFor={ids.theme}>
          <Select
            id={ids.theme}
            value={general.theme}
            options={THEMES}
            onChange={(theme) =>
              update((draft) => {
                draft.general.theme = theme
              })
            }
          />
        </Row>

        <Row label="Display size" hint="How much of the screen the digits fill." htmlFor={ids.scale}>
          <Select
            id={ids.scale}
            value={general.heroScale}
            options={SCALES}
            onChange={(heroScale) =>
              update((draft) => {
                draft.general.heroScale = heroScale
              })
            }
          />
        </Row>

        <Row label="Interface position" htmlFor={ids.position}>
          <Select
            id={ids.position}
            value={general.chromePosition}
            options={POSITIONS}
            onChange={(chromePosition) =>
              update((draft) => {
                draft.general.chromePosition = chromePosition
              })
            }
          />
        </Row>

        <Row
          label="Hide the interface after"
          hint="Move the pointer or press a key to bring it back."
          htmlFor={ids.idle}
        >
          <Select
            id={ids.idle}
            value={String(general.idleTimeoutMs)}
            options={IDLE_TIMEOUTS.map((ms) => ({ value: String(ms), label: IDLE_LABELS[ms] }))}
            onChange={(value) =>
              update((draft) => {
                draft.general.idleTimeoutMs = Number(value)
              })
            }
          />
        </Row>

        <Row label="Hide the cursor with the interface">
          <Toggle
            label="Hide the cursor with the interface"
            checked={general.hideCursorWhenIdle}
            onChange={(hideCursorWhenIdle) =>
              update((draft) => {
                draft.general.hideCursorWhenIdle = hideCursorWhenIdle
              })
            }
          />
        </Row>
      </Section>

      <Section title="Behaviour">
        <Row label="Time format" htmlFor={ids.format}>
          <Select
            id={ids.format}
            value={general.hour12 ? '12' : '24'}
            options={FORMATS}
            onChange={(value) =>
              update((draft) => {
                draft.general.hour12 = value === '12'
              })
            }
          />
        </Row>

        <Row label="Open in" htmlFor={ids.startup}>
          <Select
            id={ids.startup}
            value={general.startupMode}
            options={STARTUP}
            onChange={(startupMode) =>
              update((draft) => {
                draft.general.startupMode = startupMode
              })
            }
          />
        </Row>

        <Row
          label="Mute everything"
          hint="Silences alarms and vibration without touching each setting."
        >
          <Toggle
            label="Mute everything"
            checked={general.globalMute}
            onChange={(globalMute) =>
              update((draft) => {
                draft.general.globalMute = globalMute
              })
            }
          />
        </Row>

        <Row
          label="Keep the screen awake"
          hint={
            supportsWakeLock()
              ? 'For leaving this running on a second screen.'
              : 'This browser does not offer a screen lock.'
          }
        >
          <Toggle
            label="Keep the screen awake"
            disabled={!supportsWakeLock()}
            checked={general.keepScreenAwake}
            onChange={(keepScreenAwake) =>
              update((draft) => {
                draft.general.keepScreenAwake = keepScreenAwake
              })
            }
          />
        </Row>

        <Row label="Show tips" hint="One-line hints, each shown at most once.">
          <Toggle
            label="Show tips"
            checked={general.tipsEnabled}
            onChange={(tipsEnabled) =>
              update((draft) => {
                draft.general.tipsEnabled = tipsEnabled
              })
            }
          />
        </Row>
      </Section>

      <Section title="This install">
        <Row label="Notifications" align="start">
          <span className="chrome-label-sm opacity-45">{PERMISSION_LABELS[notificationPermission()]}</span>
        </Row>
        <Row label="Running as an app">
          <span className="chrome-label-sm opacity-45">{isStandalone() ? 'Yes' : 'In a browser tab'}</span>
        </Row>
        <Row label="Works offline">
          <span className="chrome-label-sm opacity-45">Yes</span>
        </Row>
      </Section>
    </>
  )
}

const PERMISSION_LABELS = {
  unsupported: 'Not supported here',
  default: 'Not asked yet',
  granted: 'Allowed',
  denied: 'Blocked in the browser',
} as const
