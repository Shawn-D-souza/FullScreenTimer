import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_SETTINGS,
  MODE_IDS,
  normalizeOrder,
  parseSettings,
  type ModeId,
  type Settings,
} from './schema'

interface SettingsActions {
  /** Mutate the settings tree with an immer recipe. */
  update: (recipe: (settings: Settings) => void) => void
  toggleTheme: () => void
  toggleMute: () => void
  setModeEnabled: (mode: ModeId, enabled: boolean) => void
  moveMode: (mode: ModeId, direction: -1 | 1) => void
  resetAll: () => void
}

export type SettingsStore = Settings & SettingsActions

export const useSettings = create<SettingsStore>()(
  persist(
    immer((set) => ({
      ...structuredClone(DEFAULT_SETTINGS),

      update: (recipe) =>
        set((state) => {
          recipe(state)
        }),

      toggleTheme: () =>
        set((state) => {
          state.general.theme = state.general.theme === 'dark' ? 'light' : 'dark'
        }),

      toggleMute: () =>
        set((state) => {
          state.general.globalMute = !state.general.globalMute
        }),

      setModeEnabled: (mode, enabled) =>
        set((state) => {
          // The PRD requires at least one mode to stay enabled.
          if (!enabled && MODE_IDS.filter((id) => state.modes.enabled[id]).length <= 1) return
          state.modes.enabled[mode] = enabled
        }),

      moveMode: (mode, direction) =>
        set((state) => {
          const order = normalizeOrder(state.modes.order)
          const index = order.indexOf(mode)
          const target = index + direction
          if (index === -1 || target < 0 || target >= order.length) return
          ;[order[index], order[target]] = [order[target], order[index]]
          state.modes.order = order
        }),

      resetAll: () =>
        set((state) => {
          Object.assign(state, structuredClone(DEFAULT_SETTINGS))
        }),
    })),
    {
      name: 'fst:settings',
      version: 1,
      // Only the settings tree is persisted; the actions are recreated on load.
      partialize: (state) => ({
        general: state.general,
        notifications: state.notifications,
        modes: state.modes,
      }),
      // Anything stored by an older release is run through the schema, which
      // repairs unknown, missing and out-of-range values field by field.
      merge: (persisted, current) => ({ ...current, ...parseSettings(persisted) }),
    },
  ),
)

/* ---------------------------------------------------------------------------
 * Selectors
 * ------------------------------------------------------------------------- */

export function selectVisibleModes(state: Settings): ModeId[] {
  const order = normalizeOrder(state.modes.order)
  const enabled = order.filter((id) => state.modes.enabled[id])
  return enabled.length > 0 ? enabled : [order[0]]
}

export function readSettings(): Settings {
  return useSettings.getState()
}
