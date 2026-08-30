import { useSettings } from '../../state/settings'
import { TIPS, useTips } from '../../state/tips'
import { GhostButton } from '../GhostButton'
import { Row, Section, Toggle } from './controls'

/**
 * The whole catalogue, so a tip that has been dismissed is never lost — the text
 * the app would have shown is still here to read, and can be turned back on.
 */
export function TipsSection() {
  const tipsEnabled = useSettings((state) => state.general.tipsEnabled)
  const update = useSettings((state) => state.update)
  const dismissed = useTips((state) => state.dismissed)
  const allowAgain = useTips((state) => state.allowAgain)
  const allowAll = useTips((state) => state.allowAll)
  const forgetAll = useTips((state) => state.forgetAll)

  const seen = TIPS.filter((tip) => dismissed[tip.id]).length

  return (
    <>
      <Section title="Tips">
        <Row label="Show tips" hint="Each tip appears at most once, then stays here.">
          <Toggle
            label="Show tips"
            checked={tipsEnabled}
            onChange={(value) =>
              update((draft) => {
                draft.general.tipsEnabled = value
              })
            }
          />
        </Row>
        <Row label={`${seen} of ${TIPS.length} already shown`} align="start">
          <GhostButton onClick={allowAll} disabled={seen === 0}>
            Show all again
          </GhostButton>
          <GhostButton onClick={forgetAll} disabled={seen === TIPS.length}>
            Dismiss all
          </GhostButton>
        </Row>
      </Section>

      <Section title="Every tip">
        {TIPS.map((tip) => {
          const isDismissed = Boolean(dismissed[tip.id])
          return (
            <div key={tip.id} className="rule-b flex items-start justify-between gap-6 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] leading-snug">{tip.text}</p>
                <p className="chrome-label-sm mt-1.5 opacity-35">{tip.context}</p>
              </div>
              {isDismissed ? (
                <GhostButton className="shrink-0" onClick={() => allowAgain(tip.id)}>
                  Show again
                </GhostButton>
              ) : (
                <span className="chrome-label-sm shrink-0 py-2 opacity-30">Pending</span>
              )}
            </div>
          )
        })}
      </Section>
    </>
  )
}
