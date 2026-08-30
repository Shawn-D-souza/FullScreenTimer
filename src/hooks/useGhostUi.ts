import { useEffect } from 'react'
import { useUi } from '../state/ui'

/**
 * The interface appears on any sign of life and fades out again when the user
 * settles. Listeners are on `window` in the capture phase so the chrome wakes even
 * when the event is handled by something else, and a coalescing flag keeps a
 * mousemove storm from touching the store more than once per frame.
 */
export function useGhostUi(): void {
  useEffect(() => {
    let queued = false

    const wake = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        useUi.getState().wake()
      })
    }

    // Pointer movement of a pixel or two is noise — a resting hand, a trackpad
    // twitch — and should not resurrect a deliberately quiet screen.
    let lastX: number | null = null
    let lastY: number | null = null
    const onPointerMove = (event: PointerEvent) => {
      if (lastX !== null && lastY !== null) {
        const travelled = Math.abs(event.clientX - lastX) + Math.abs(event.clientY - lastY)
        if (travelled < 4) return
      }
      lastX = event.clientX
      lastY = event.clientY
      wake()
    }

    const options: AddEventListenerOptions = { capture: true, passive: true }
    window.addEventListener('pointermove', onPointerMove, options)
    window.addEventListener('pointerdown', wake, options)
    window.addEventListener('keydown', wake, options)
    window.addEventListener('wheel', wake, options)
    window.addEventListener('touchstart', wake, options)
    window.addEventListener('focusin', wake, options)

    // Show the chrome once on arrival, then let it fade: a blank black screen is
    // the point of the app, but nobody would guess how to use it.
    useUi.getState().wake()

    return () => {
      window.removeEventListener('pointermove', onPointerMove, options)
      window.removeEventListener('pointerdown', wake, options)
      window.removeEventListener('keydown', wake, options)
      window.removeEventListener('wheel', wake, options)
      window.removeEventListener('touchstart', wake, options)
      window.removeEventListener('focusin', wake, options)
    }
  }, [])
}
