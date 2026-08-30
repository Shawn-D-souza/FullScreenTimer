import { useUi } from '../state/ui'

/**
 * The app's whole visual language is a number that changes silently, which tells a
 * screen-reader user nothing. Every phase change, mode switch and alarm is spoken
 * here instead.
 */
export function LiveRegion() {
  const message = useUi((state) => state.liveMessage)

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
