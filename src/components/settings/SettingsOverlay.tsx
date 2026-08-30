import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { useSettings } from '../../state/settings'
import { useUi } from '../../state/ui'
import { GhostButton } from '../GhostButton'
import { GeneralSection } from './GeneralSection'
import { KeyboardSection } from './KeyboardSection'
import { ModesSection } from './ModesSection'
import { NotificationsSection } from './NotificationsSection'
import { TipsSection } from './TipsSection'

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'modes', label: 'Modes' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'tips', label: 'Tips' },
] as const

export function SettingsOverlay() {
  const open = useUi((state) => state.settingsOpen)
  const setOpen = useUi((state) => state.setSettingsOpen)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        {/* Opaque, not translucent: settings is a place to be, not a peek behind. */}
        <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-40 bg-paper" />
        <Dialog.Content
          aria-describedby={undefined}
          className="animate-panel-in fixed inset-0 z-50 flex flex-col focus:outline-none"
        >
          <header className="rule-b flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Dialog.Title className="chrome-label">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <GhostButton variant="icon" aria-label="Close settings">
                <X size={17} strokeWidth={1.5} />
              </GhostButton>
            </Dialog.Close>
          </header>

          <Tabs.Root
            defaultValue="general"
            orientation="vertical"
            className="flex min-h-0 flex-1 flex-col sm:flex-row"
          >
            <Tabs.List
              aria-label="Settings sections"
              className={cn(
                'scroll-quiet flex shrink-0 gap-1 overflow-x-auto px-4 py-3',
                'sm:w-52 sm:flex-col sm:overflow-y-auto sm:px-5 sm:py-6',
                'rule-b sm:border-b-0 sm:border-r sm:border-r-ink/15',
              )}
            >
              {TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'chrome-label shrink-0 rounded-full px-3 py-2 text-left opacity-45 transition-opacity',
                    'hover:opacity-100 focus-visible:opacity-100',
                    'data-[state=active]:bg-ink data-[state=active]:text-paper data-[state=active]:opacity-100',
                    'sm:rounded-none sm:bg-transparent sm:px-0 sm:data-[state=active]:bg-transparent',
                    'sm:data-[state=active]:text-ink',
                  )}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
              <div className="mx-auto max-w-2xl pb-10">
                <Tabs.Content value="general" className="focus:outline-none">
                  <GeneralSection />
                  <DangerZone />
                </Tabs.Content>
                <Tabs.Content value="modes" className="focus:outline-none">
                  <ModesSection />
                </Tabs.Content>
                <Tabs.Content value="notifications" className="focus:outline-none">
                  <NotificationsSection />
                </Tabs.Content>
                <Tabs.Content value="keyboard" className="focus:outline-none">
                  <KeyboardSection />
                </Tabs.Content>
                <Tabs.Content value="tips" className="focus:outline-none">
                  <TipsSection />
                </Tabs.Content>
              </div>
            </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Two clicks, because there is no undo and nothing here is worth a dialog. */
function DangerZone() {
  const resetAll = useSettings((state) => state.resetAll)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="rule-t flex items-center justify-between gap-4 pt-6">
      <p className="chrome-label-sm max-w-xs leading-relaxed opacity-40">
        Restore every setting to its default. Running timers are left alone.
      </p>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <GhostButton onClick={() => setConfirming(false)}>Cancel</GhostButton>
          <GhostButton
            variant="solid"
            onClick={() => {
              resetAll()
              setConfirming(false)
            }}
          >
            Reset
          </GhostButton>
        </div>
      ) : (
        <GhostButton className="shrink-0" onClick={() => setConfirming(true)}>
          Reset all settings
        </GhostButton>
      )}
    </div>
  )
}
