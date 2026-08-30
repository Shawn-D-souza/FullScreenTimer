import { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  adjustTimer,
  cycleMode,
  openSettings,
  primaryAction,
  recordLap,
  requestFullscreen,
  resetActive,
  skipPhase,
  switchModeByIndex,
  toggleChrome,
  toggleMute,
  toggleShortcuts,
  toggleTheme,
} from '../state/controller'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'
import { MINUTE } from '../lib/time'

const INTERACTIVE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Is focus sitting on something that handles keys itself? The app deliberately
 * takes over Tab and Space, but not at the cost of making its own ghost controls
 * unusable from the keyboard.
 */
function focusIsOnControl(): boolean {
  const active = document.activeElement
  if (!active || active === document.body || active === document.documentElement) return false
  return active.matches(INTERACTIVE)
}

export function useAppHotkeys(): void {
  const overlayOpen = useUi((state) => state.settingsOpen || state.shortcutsOpen)
  const activeMode = useSession((state) => state.activeMode)
  const enabled = !overlayOpen

  useHotkeys(
    'space',
    (event) => {
      // A focused button already turns Space into a click; don't act twice.
      if (focusIsOnControl()) return
      event.preventDefault()
      primaryAction()
    },
    { enabled, preventDefault: false },
  )

  useHotkeys('r', () => resetActive(), { enabled })

  useHotkeys(
    'tab',
    (event) => {
      // Once the user has tabbed into the chrome, Tab belongs to focus again.
      if (focusIsOnControl()) return
      event.preventDefault()
      cycleMode(1)
    },
    { enabled, preventDefault: false },
  )

  useHotkeys(
    'shift+tab',
    (event) => {
      if (focusIsOnControl()) return
      event.preventDefault()
      cycleMode(-1)
    },
    { enabled, preventDefault: false },
  )

  useHotkeys('right', () => cycleMode(1), { enabled, preventDefault: true })
  useHotkeys('left', () => cycleMode(-1), { enabled, preventDefault: true })

  useHotkeys(
    '1,2,3,4,5',
    (_event, handler) => {
      const index = Number.parseInt(handler.keys?.[0] ?? '', 10)
      if (Number.isFinite(index)) switchModeByIndex(index)
    },
    { enabled },
  )

  useHotkeys('l', () => recordLap(), { enabled: enabled && activeMode === 'stopwatch' })
  useHotkeys('n', () => skipPhase(), { enabled: enabled && activeMode === 'pomodoro' })

  useHotkeys('up', () => adjustTimer(MINUTE), {
    enabled: enabled && activeMode === 'timer',
    preventDefault: true,
  })
  useHotkeys('down', () => adjustTimer(-MINUTE), {
    enabled: enabled && activeMode === 'timer',
    preventDefault: true,
  })

  useHotkeys('s', () => openSettings(), { enabled })
  useHotkeys('h', () => toggleChrome(), { enabled })
  useHotkeys('d', () => toggleTheme(), { enabled })
  useHotkeys('m', () => toggleMute(), { enabled })
  useHotkeys('f', () => requestFullscreen(), { enabled })

  // `?` rather than shift+slash so the binding survives non-US layouts.
  useHotkeys('?', () => toggleShortcuts(), {
    enabled,
    useKey: true,
    ignoreModifiers: true,
  })

  // Escape with nothing open means "leave me alone".
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const ui = useUi.getState()
      if (ui.settingsOpen || ui.shortcutsOpen) return
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      ui.hideNow()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
