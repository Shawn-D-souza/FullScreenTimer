import { create } from 'zustand'
import { readSettings } from './settings'

/**
 * Transient interface state. None of this is persisted: the ghost UI should be
 * invisible on every fresh load, which is the whole point of it.
 */
interface UiState {
  chromeVisible: boolean
  /** H hides the interface outright — no pointer movement brings it back. */
  chromeLocked: boolean
  hovering: boolean
  settingsOpen: boolean
  shortcutsOpen: boolean
  fullscreen: boolean
  /** Bumped on every alarm so the hero can pulse without a boolean race. */
  flashKey: number
  liveMessage: string

  wake: () => void
  hideNow: () => void
  toggleChromeLock: () => void
  setHovering: (hovering: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  setFullscreen: (value: boolean) => void
  flash: () => void
  announce: (message: string) => void
}

let hideTimer: number | null = null

function clearHideTimer(): void {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export const useUi = create<UiState>()((set, get) => {
  /** Keeps the chrome up while a menu is open or the pointer is on a control. */
  const isPinned = (): boolean => {
    const state = get()
    return state.settingsOpen || state.shortcutsOpen || state.hovering
  }

  const scheduleHide = (): void => {
    clearHideTimer()
    if (isPinned()) return

    const { idleTimeoutMs } = readSettings().general
    if (idleTimeoutMs <= 0) return

    hideTimer = window.setTimeout(() => {
      hideTimer = null
      if (!isPinned() && !get().settingsOpen) set({ chromeVisible: false })
    }, idleTimeoutMs)
  }

  return {
    chromeVisible: false,
    chromeLocked: false,
    hovering: false,
    settingsOpen: false,
    shortcutsOpen: false,
    fullscreen: false,
    flashKey: 0,
    liveMessage: '',

    wake: () => {
      if (get().chromeLocked) return
      if (!get().chromeVisible) set({ chromeVisible: true })
      scheduleHide()
    },

    hideNow: () => {
      clearHideTimer()
      set({ chromeVisible: false })
    },

    toggleChromeLock: () => {
      const locked = !get().chromeLocked
      clearHideTimer()
      set({ chromeLocked: locked, chromeVisible: !locked })
      if (!locked) scheduleHide()
    },

    setHovering: (hovering) => {
      set({ hovering })
      if (hovering) {
        clearHideTimer()
      } else {
        scheduleHide()
      }
    },

    setSettingsOpen: (open) => {
      set({ settingsOpen: open, chromeVisible: open ? true : get().chromeVisible })
      if (open) {
        clearHideTimer()
      } else {
        scheduleHide()
      }
    },

    setShortcutsOpen: (open) => {
      set({ shortcutsOpen: open, chromeVisible: open ? true : get().chromeVisible })
      if (open) {
        clearHideTimer()
      } else {
        scheduleHide()
      }
    },

    setFullscreen: (value) => set({ fullscreen: value }),

    flash: () => set((state) => ({ flashKey: state.flashKey + 1 })),

    announce: (message) =>
      set((state) => ({
        // A live region that does not change is not re-announced, so alternate an
        // invisible trailing character when the same thing is said twice in a row.
        // A plain space would be collapsed away by the DOM; a no-break space is not.
        liveMessage: state.liveMessage === message ? `${message}\u00a0` : message,
      })),
  }
})

export function isOverlayOpen(): boolean {
  const state = useUi.getState()
  return state.settingsOpen || state.shortcutsOpen
}
