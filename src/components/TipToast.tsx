import { cn } from '../lib/cn'
import { TIP_BY_ID, useTips } from '../state/tips'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'

/**
 * A tip appears once, explains one thing, and offers to never come back. The
 * checkbox is checked by default: a tip the user has read has done its job, and
 * an app about staying out of the way should not need to be told twice.
 */
export function TipToast() {
  const current = useTips((state) => state.current)
  const dontShowAgain = useTips((state) => state.dontShowAgain)
  const setDontShowAgain = useTips((state) => state.setDontShowAgain)
  const dismiss = useTips((state) => state.dismissCurrent)
  const position = useSettings((state) => state.general.chromePosition)

  if (current === null) return null
  const tip = TIP_BY_ID[current]

  return (
    <div
      className={cn(
        'animate-tip-in absolute inset-x-0 z-30 flex justify-center px-4',
        // Sits opposite the chrome so the two never argue over the same corner.
        position === 'top' ? 'bottom-8' : 'top-8',
      )}
      onPointerEnter={() => useUi.getState().setHovering(true)}
      onPointerLeave={() => useUi.getState().setHovering(false)}
    >
      <div className="flex max-w-lg flex-col gap-3 border border-ink/15 bg-paper/85 px-5 py-4 backdrop-blur-sm">
        <p className="text-[0.8125rem] leading-relaxed">{tip.text}</p>

        <div className="flex items-center justify-between gap-6">
          <label className="chrome-label-sm flex cursor-pointer items-center gap-2 opacity-55 transition-opacity hover:opacity-100">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="size-3 appearance-none border border-ink checked:bg-ink"
            />
            Don&rsquo;t show again
          </label>

          <button
            type="button"
            onClick={dismiss}
            className="chrome-label-sm opacity-55 transition-opacity hover:opacity-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
