import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

interface ShortcutHandlers {
  onSpace?: () => void
  onR?: () => void
  onL?: () => void
  onS?: () => void
  onQuestion?: () => void
  onF?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const { toggleTheme, activeMode, enabledModes, setActiveMode } = useStore()
  
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault() // prevent page scroll
          handlersRef.current.onSpace?.()
          break
        case 'r':
        case 'R':
          handlersRef.current.onR?.()
          break
        case 'l':
        case 'L':
          handlersRef.current.onL?.()
          break
        case 's':
        case 'S':
          handlersRef.current.onS?.()
          break
        case '?':
          handlersRef.current.onQuestion?.()
          break
        case 'f':
        case 'F':
          handlersRef.current.onF?.()
          break
        case 'd':
        case 'D':
          toggleTheme()
          break
        case 'Tab': {
          e.preventDefault()
          if (enabledModes.length === 0) return
          const currentIndex = enabledModes.indexOf(activeMode)
          let nextIndex
          if (e.shiftKey) {
            nextIndex = (currentIndex - 1 + enabledModes.length) % enabledModes.length
          } else {
            nextIndex = (currentIndex + 1) % enabledModes.length
          }
          setActiveMode(enabledModes[nextIndex])
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMode, enabledModes, setActiveMode, toggleTheme])
}
