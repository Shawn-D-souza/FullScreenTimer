import { SHORTCUTS } from '../../lib/shortcuts'
import { MODE_LABELS } from '../../state/schema'
import { Kbd } from '../ShortcutsOverlay'
import { Section } from './controls'

export function KeyboardSection() {
  return (
    <Section
      title="Keyboard"
      description="Fixed for now. Press ? at any time to see this without opening settings."
    >
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.binding} className="rule-b flex items-center justify-between gap-6 py-3">
          <span className="text-[0.875rem]">
            {shortcut.action}
            {shortcut.modes ? (
              <span className="chrome-label-sm ml-2 opacity-40">
                {shortcut.modes.map((mode) => MODE_LABELS[mode]).join(' · ')}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {shortcut.keys.map((key, index) => (
              <Kbd key={`${key}-${index}`}>{key}</Kbd>
            ))}
          </span>
        </div>
      ))}
    </Section>
  )
}
