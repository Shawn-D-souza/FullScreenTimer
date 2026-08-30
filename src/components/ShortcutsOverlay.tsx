import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { SHORTCUTS } from '../lib/shortcuts'
import { MODE_LABELS } from '../state/schema'
import { useUi } from '../state/ui'
import { GhostButton } from './GhostButton'

/** Renders a key the way a keyboard does: as an object, not as text. */
export function Kbd({ children }: { children: string }) {
  if (children === '–') return <span className="opacity-40">–</span>
  return (
    <kbd className="chrome-label-sm grid min-w-7 place-items-center rounded border border-ink/25 px-1.5 py-1.5">
      {children}
    </kbd>
  )
}

export function ShortcutsOverlay() {
  const open = useUi((state) => state.shortcutsOpen)
  const setOpen = useUi((state) => state.setShortcutsOpen)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-40 bg-paper/80 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          className="animate-panel-in fixed inset-0 z-50 grid place-items-center p-6 focus:outline-none"
        >
          <div className="scroll-quiet max-h-full w-full max-w-3xl overflow-y-auto">
            <header className="rule-b mb-6 flex items-baseline justify-between gap-4 pb-4">
              <Dialog.Title className="chrome-label">Keyboard</Dialog.Title>
              <Dialog.Close asChild>
                <GhostButton variant="icon" aria-label="Close">
                  <X size={17} strokeWidth={1.5} />
                </GhostButton>
              </Dialog.Close>
            </header>

            <dl className="grid gap-x-12 gap-y-0 sm:grid-cols-2">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.binding}
                  className="rule-b flex items-center justify-between gap-6 py-3"
                >
                  <dt className="text-[0.8125rem] leading-tight">
                    {shortcut.action}
                    {shortcut.modes ? (
                      <span className="chrome-label-sm ml-2 opacity-40">
                        {shortcut.modes.map((mode) => MODE_LABELS[mode]).join(' · ')}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key, index) => (
                      <Kbd key={`${key}-${index}`}>{key}</Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="chrome-label-sm mt-6 leading-relaxed opacity-40">
              Tab and Space move focus and press buttons once you are inside the interface.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
