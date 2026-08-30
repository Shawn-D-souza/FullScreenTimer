import { useShallow } from 'zustand/react/shallow'
import { cn } from '../lib/cn'
import { switchMode } from '../state/controller'
import { MODE_LABELS } from '../state/schema'
import { selectVisibleModes, useSettings } from '../state/settings'
import { useSession } from '../state/session'
import { GhostButton } from './GhostButton'

/**
 * Mode selection. The active mode is the one thing in the chrome drawn in
 * reverse — the only place the app inverts its two colours — because it is the
 * only piece of state the user needs to find without reading.
 */
export function ModeTabs() {
  // A fresh array every call, so the shallow comparator is what keeps this quiet.
  const modes = useSettings(useShallow(selectVisibleModes))
  const activeMode = useSession((state) => state.activeMode)

  if (modes.length < 2) return null

  return (
    <div
      role="tablist"
      aria-label="Mode"
      aria-orientation="horizontal"
      className="scroll-quiet -mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1"
    >
      {modes.map((mode) => {
        const selected = mode === activeMode
        return (
          <GhostButton
            key={mode}
            role="tab"
            aria-selected={selected}
            variant={selected ? 'solid' : 'ghost'}
            className={cn('shrink-0', selected && 'opacity-100')}
            onClick={() => switchMode(mode)}
          >
            {MODE_LABELS[mode]}
          </GhostButton>
        )
      })}
    </div>
  )
}
