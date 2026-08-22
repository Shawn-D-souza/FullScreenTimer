import { useEffect } from 'react'
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
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault() // prevent page scroll
          handlers.onSpace?.()
          break
        case 'r':
        case 'R':
          handlers.onR?.()
          break
        case 'l':
        case 'L':
          handlers.onL?.()
          break
        case 's':
        case 'S':
          handlers.onS?.()
          break
        case '?':
          handlers.onQuestion?.()
          break
        case 'f':
        case 'F':
          handlers.onF?.()
          break
        case 'd':
        case 'D':
          toggleTheme()
          break
        case 'Tab':
          e.preventDefault()
          if (enabledModes.length === 0) return
          const currentIndex = enabledModes.indexOf(activeMode)
          let nextIndex = currentIndex
          if (e.shiftKey) {
            nextIndex = (currentIndex - 1 + enabledModes.length) % enabledModes.length
          } else {
            nextIndex = (currentIndex + 1) % enabledModes.length
          }
          setActiveMode(enabledModes[nextIndex])
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers, activeMode, enabledModes, setActiveMode, toggleTheme])
}
