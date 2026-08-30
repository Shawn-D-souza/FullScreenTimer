import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { readSettings } from './settings'

/* ---------------------------------------------------------------------------
 * The tip catalogue. Every tip the app can ever show is listed here, which is
 * also what Settings → Tips renders — so the list the user browses can never
 * drift from the list the app draws from.
 * ------------------------------------------------------------------------- */

export const TIPS = [
  {
    id: 'welcome',
    text: 'Every tip lives in Settings → Tips. Press S to open settings.',
    context: 'First launch',
  },
  {
    id: 'space',
    text: 'Press Space to start or pause.',
    context: 'A mode is ready to run',
  },
  {
    id: 'shortcuts',
    text: 'Press ? to see every keyboard shortcut.',
    context: 'After the first start',
  },
  {
    id: 'modes',
    text: 'You can reorder or disable modes in Settings → Modes.',
    context: 'After switching modes',
  },
  {
    id: 'timer-adjust',
    text: 'Set the timer with ↑ and ↓, or pick a preset below.',
    context: 'Timer is idle',
  },
  {
    id: 'lap',
    text: 'Press L to record a lap.',
    context: 'Stopwatch is running',
  },
  {
    id: 'pomodoro-rounds',
    text: 'The dots track your rounds until the long break.',
    context: 'Pomodoro is running',
  },
  {
    id: 'flowmodoro',
    text: 'Flowmodoro sets your break from how long you actually focused — focused time ÷ 5.',
    context: 'Opening flowmodoro',
  },
  {
    id: 'notifications',
    text: 'Allow notifications and the alarm will reach you in another tab.',
    context: 'Starting a countdown without permission',
  },
  {
    id: 'chrome-hidden',
    text: 'Interface hidden. Press H to bring it back.',
    context: 'Pressing H',
  },
  {
    id: 'muted',
    text: 'Everything is muted. Press M to unmute.',
    context: 'Pressing M',
  },
  {
    id: 'install',
    text: 'Install this app for alarms that keep working outside the browser.',
    context: 'The browser offers installation',
  },
] as const

export type TipId = (typeof TIPS)[number]['id']

export const TIP_BY_ID: Record<TipId, (typeof TIPS)[number]> = Object.fromEntries(
  TIPS.map((tip) => [tip.id, tip]),
) as Record<TipId, (typeof TIPS)[number]>

/** How long a tip lingers before dissolving on its own. */
export const TIP_DURATION_MS = 9000

/* ---------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */

interface TipsState {
  /** Tips the user has let go with "don't show again" left checked. */
  dismissed: Partial<Record<TipId, boolean>>
  current: TipId | null
  queue: TipId[]
  /** Mirrors the checkbox on the visible tip; checked by default, per the PRD. */
  dontShowAgain: boolean

  request: (id: TipId) => void
  setDontShowAgain: (value: boolean) => void
  dismissCurrent: () => void
  /** Retire a tip because the user just did the thing it was about to suggest. */
  suppress: (id: TipId) => void
  allowAgain: (id: TipId) => void
  allowAll: () => void
  forgetAll: () => void
}

/** Once per session, independent of whether the user opted out permanently. */
const shownThisSession = new Set<TipId>()

let hideTimer: number | null = null

export const useTips = create<TipsState>()(
  persist(
    (set, get) => {
      const startTimer = (): void => {
        if (hideTimer !== null) clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => {
          hideTimer = null
          get().dismissCurrent()
        }, TIP_DURATION_MS)
      }

      const showNext = (): void => {
        const state = get()
        if (state.current !== null) return
        const next = state.queue[0]
        if (next === undefined) return
        set({ current: next, queue: state.queue.slice(1), dontShowAgain: true })
        startTimer()
      }

      return {
        dismissed: {},
        current: null,
        queue: [],
        dontShowAgain: true,

        request: (id) => {
          if (!readSettings().general.tipsEnabled) return
          const state = get()
          if (shownThisSession.has(id)) return
          if (state.dismissed[id]) return
          if (state.current === id || state.queue.includes(id)) return

          shownThisSession.add(id)
          set({ queue: [...state.queue, id] })
          showNext()
        },

        setDontShowAgain: (value) => {
          set({ dontShowAgain: value })
          // Interacting with the checkbox means the user is reading: hold the tip.
          if (hideTimer !== null) clearTimeout(hideTimer)
          hideTimer = window.setTimeout(() => {
            hideTimer = null
            get().dismissCurrent()
          }, TIP_DURATION_MS)
        },

        dismissCurrent: () => {
          if (hideTimer !== null) {
            clearTimeout(hideTimer)
            hideTimer = null
          }
          const { current, dontShowAgain, dismissed } = get()
          if (current === null) return
          set({
            current: null,
            dismissed: dontShowAgain ? { ...dismissed, [current]: true } : dismissed,
          })
          // Let the exit transition finish before the next one arrives.
          window.setTimeout(showNext, 420)
        },

        suppress: (id) => {
          shownThisSession.add(id)
          set((state) => ({
            dismissed: { ...state.dismissed, [id]: true },
            current: state.current === id ? null : state.current,
            queue: state.queue.filter((queued) => queued !== id),
          }))
        },

        allowAgain: (id) => {
          shownThisSession.delete(id)
          set((state) => {
            const next = { ...state.dismissed }
            delete next[id]
            return { dismissed: next }
          })
        },

        allowAll: () => {
          shownThisSession.clear()
          set({ dismissed: {} })
        },

        forgetAll: () => {
          const dismissed = Object.fromEntries(TIPS.map((tip) => [tip.id, true])) as Partial<
            Record<TipId, boolean>
          >
          set({ dismissed, current: null, queue: [] })
        },
      }
    },
    {
      name: 'fst:tips',
      version: 1,
      partialize: (state) => ({ dismissed: state.dismissed }),
    },
  ),
)

/** Fire-and-forget helper so callers never need the hook. */
export function requestTip(id: TipId): void {
  useTips.getState().request(id)
}
