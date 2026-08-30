import { cn } from '../lib/cn'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { IconCluster } from './IconCluster'
import { ModeControls } from './ModeControls'
import { ModeTabs } from './ModeTabs'

/**
 * The ghost interface.
 *
 * It is always in the DOM — mounting controls on wake would cost a frame and let
 * layout shift — and always focusable order-wise, but it is invisible and
 * untouchable until the user does something. `inert` is what keeps a faded bar
 * out of the tab order without a `tabIndex` sweep over every child.
 */
export function Chrome() {
  const visible = useUi((state) => state.chromeVisible)
  const position = useSettings((state) => state.general.chromePosition)

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={cn(
        'absolute inset-x-0 z-20 flex flex-col items-center gap-2 px-4 transition-opacity ease-ghost',
        position === 'top' ? 'top-0 pt-4 pb-6' : 'bottom-0 pt-6 pb-4',
        // Slow to appear, slower to leave: the fade is the app's only flourish.
        visible ? 'opacity-100 duration-200' : 'pointer-events-none opacity-0 duration-700',
      )}
      onPointerEnter={() => useUi.getState().setHovering(true)}
      onPointerLeave={() => useUi.getState().setHovering(false)}
    >
      <ModeControls />
      <div className="flex w-full max-w-5xl items-center justify-between gap-3">
        <ModeTabs />
        <IconCluster />
      </div>
    </div>
  )
}
