import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import { GhostUI } from './components/GhostUI'
import { ModeSwitcher } from './components/ModeSwitcher'
import { Settings } from './components/Settings'
import { Clock } from './components/modes/Clock'
import { Stopwatch } from './components/modes/Stopwatch'
import { Timer } from './components/modes/Timer'
import { Pomodoro } from './components/modes/Pomodoro'
import { Flowmodoro } from './components/modes/Flowmodoro'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFullscreen } from './hooks/useFullscreen'
import { AnimatePresence } from 'framer-motion'

function App() {
  const { theme, activeMode } = useStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  // Apply dark mode to HTML tag for Tailwind
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Request notification permissions once on first click/interaction if we need it
  // (In MVP, we just do it when a timer starts, handled inside the hook or component if possible, 
  // but doing it on first global interaction is also common.)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      window.removeEventListener('click', handleFirstInteraction)
    }
    window.addEventListener('click', handleFirstInteraction)
    return () => window.removeEventListener('click', handleFirstInteraction)
  }, [])

  useKeyboardShortcuts({
    onS: () => setIsSettingsOpen(true),
    onQuestion: () => setIsSettingsOpen(true),
    onF: toggleFullscreen,
  })

  const renderActiveMode = () => {
    switch (activeMode) {
      case 'Clock': return <Clock />
      case 'Stopwatch': return <Stopwatch />
      case 'Timer': return <Timer />
      case 'Pomodoro': return <Pomodoro />
      case 'Flowmodoro': return <Flowmodoro />
      default: return null
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white transition-colors duration-500 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* The main stage for the active mode */}
      <main className="w-full h-full">
        {renderActiveMode()}
      </main>

      {/* The ghost UI layer */}
      {!isSettingsOpen && (
        <GhostUI 
          onOpenSettings={() => setIsSettingsOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        >
          <ModeSwitcher />
        </GhostUI>
      )}

      {/* Settings overlay */}
      <AnimatePresence>
        {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
      </AnimatePresence>

    </div>
  )
}

export default App