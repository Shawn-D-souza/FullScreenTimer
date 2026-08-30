import { useAlarmEngine } from './hooks/useAlarmEngine'
import { useAppHotkeys } from './hooks/useAppHotkeys'
import { useDocumentChrome } from './hooks/useDocumentChrome'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { useGhostUi } from './hooks/useGhostUi'
import { primaryAction } from './state/controller'
import { useSession } from './state/session'
import { Chrome } from './components/Chrome'
import { LiveRegion } from './components/LiveRegion'
import { ShortcutsOverlay } from './components/ShortcutsOverlay'
import { TipToast } from './components/TipToast'
import { SettingsOverlay } from './components/settings/SettingsOverlay'
import { ClockView } from './components/views/ClockView'
import { FlowmodoroView } from './components/views/FlowmodoroView'
import { PomodoroView } from './components/views/PomodoroView'
import { StopwatchView } from './components/views/StopwatchView'
import { TimerView } from './components/views/TimerView'

/** Elements that handle their own pointer input, so a tap on them is not a tap on the stage. */
const NON_TAP = 'button, a, input, select, textarea, label, [role="slider"], [data-no-tap]'

export function App() {
  useDocumentChrome()
  useDocumentTitle()
  useGhostUi()
  useAppHotkeys()
  useAlarmEngine()

  const activeMode = useSession((state) => state.activeMode)

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/*
        Tapping the empty screen starts and stops, which is the only sensible
        primary control on a phone. Anything that owns its own pointer behaviour
        opts out by being one of these.
      */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-4 py-24"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const target = event.target as HTMLElement | null
          if (target?.closest(NON_TAP)) return
          primaryAction()
        }}
      >
        {activeMode === 'clock' ? <ClockView /> : null}
        {activeMode === 'stopwatch' ? <StopwatchView /> : null}
        {activeMode === 'timer' ? <TimerView /> : null}
        {activeMode === 'pomodoro' ? <PomodoroView /> : null}
        {activeMode === 'flowmodoro' ? <FlowmodoroView /> : null}
      </div>

      <Chrome />
      <TipToast />
      <ShortcutsOverlay />
      <SettingsOverlay />
      <LiveRegion />
    </div>
  )
}
