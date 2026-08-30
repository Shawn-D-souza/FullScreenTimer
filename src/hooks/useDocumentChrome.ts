import { useEffect } from 'react'
import { isFullscreen, setWakeLock, watchWakeLock } from '../lib/pwa'
import { useSettings } from '../state/settings'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'

/**
 * Everything that lives outside React's tree: the theme attribute the pre-paint
 * script in `index.html` set, the browser UI colour, the wake lock, and the
 * fullscreen flag.
 */
export function useDocumentChrome(): void {
  const theme = useSettings((state) => state.general.theme)
  const heroScale = useSettings((state) => state.general.heroScale)
  const keepAwake = useSettings((state) => state.general.keepScreenAwake)
  const hideCursor = useSettings((state) => state.general.hideCursorWhenIdle)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.style.colorScheme = theme

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000')
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-scale', heroScale)
  }, [heroScale])

  /* The cursor belongs to the interface: when that fades, so does it. */
  useEffect(() => {
    const apply = () => {
      const hide = hideCursor && !useUi.getState().chromeVisible
      const root = document.documentElement
      if (hide) {
        root.setAttribute('data-cursor', 'hidden')
      } else {
        root.removeAttribute('data-cursor')
      }
    }
    apply()
    return useUi.subscribe(apply)
  }, [hideCursor])

  useEffect(() => {
    setWakeLock(keepAwake)
    return () => setWakeLock(false)
  }, [keepAwake])

  useEffect(() => watchWakeLock(), [])

  /* The fullscreen button can be beaten by Escape or F11, so trust the event. */
  useEffect(() => {
    const sync = () => useUi.getState().setFullscreen(isFullscreen())
    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  /**
   * Durations and enabled modes can change under a session that is already
   * running, so idle displays are reconciled whenever settings do.
   */
  useEffect(
    () =>
      useSettings.subscribe(() => {
        const session = useSession.getState()
        session.syncFromSettings()
        session.ensureValidMode()
      }),
    [],
  )
}
