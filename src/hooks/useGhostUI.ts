import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

export function useGhostUI() {
  const [isVisible, setIsVisible] = useState(true)
  const [isForcedHidden, setIsForcedHidden] = useState(false)
  const idleTimeoutSeconds = useStore((state) => state.idleTimeoutSeconds)

  const toggleForcedHidden = useCallback(() => {
    setIsForcedHidden((prev) => {
      const next = !prev
      if (next) setIsVisible(false)
      else setIsVisible(true)
      return next
    })
  }, [])

  useEffect(() => {
    if (isForcedHidden) return

    let timeoutId: number

    const handleActivity = () => {
      setIsVisible(true)
      
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }

      if (idleTimeoutSeconds > 0) {
        timeoutId = window.setTimeout(() => {
          setIsVisible(false)
        }, idleTimeoutSeconds * 1000)
      }
    }

    // Set initial timeout
    handleActivity()

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('click', handleActivity)

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [idleTimeoutSeconds, isForcedHidden])

  return { isVisible, isForcedHidden, toggleForcedHidden }
}
