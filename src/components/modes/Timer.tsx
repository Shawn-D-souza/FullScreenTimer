import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useGhostUI } from '../../hooks/useGhostUI'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAlerts } from '../../hooks/useAlerts'
import { motion, AnimatePresence } from 'framer-motion'

function formatTime(secondsLeft: number) {
  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const seconds = secondsLeft % 60

  const parts = []
  if (hours > 0) parts.push(hours.toString().padStart(2, '0'))
  parts.push(minutes.toString().padStart(2, '0'))
  parts.push(seconds.toString().padStart(2, '0'))

  return parts.join(':')
}

const PRESETS = [5, 10, 15, 25, 45]

export function Timer() {
  const { timerSettings, activeMode } = useStore()
  const { isVisible } = useGhostUI()
  const { triggerAlert } = useAlerts()
  
  const isActive = activeMode === 'Timer'

  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timerSettings.defaultDurationMinutes * 60)
  const endTimeRef = useRef<number | null>(null)
  
  // Track if we just finished to avoid re-triggering alarm
  const finishedRef = useRef(false)

  useEffect(() => {
    let intervalId: number
    
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + (timeLeft * 1000)
      }

      intervalId = window.setInterval(() => {
        if (!endTimeRef.current) return
        
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))
        
        setTimeLeft(remaining)

        if (remaining === 0) {
          setIsRunning(false)
          endTimeRef.current = null
          if (!finishedRef.current) {
            finishedRef.current = true
            triggerAlert({
              sound: timerSettings.alertSound,
              vibration: timerSettings.alertVibration,
              notificationTitle: 'Timer Finished',
              notificationBody: 'Your timer has reached zero.',
            })
            if (timerSettings.autoReset) {
              setTimeout(() => {
                setTimeLeft(timerSettings.defaultDurationMinutes * 60)
                finishedRef.current = false
              }, 3000)
            }
          }
        }
      }, 200) // check more frequently than 1s to be accurate when tab is focused
    } else {
      endTimeRef.current = null
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [isRunning, timeLeft, triggerAlert, timerSettings])

  useEffect(() => {
    if (isActive) {
      document.title = `${formatTime(timeLeft)} — Timer`
    }
  }, [timeLeft, isActive])

  const handleStartPause = () => {
    if (timeLeft === 0 && !isRunning) {
      // reset if trying to start from 0
      handleReset()
      setIsRunning(true)
    } else {
      setIsRunning(prev => !prev)
    }
    finishedRef.current = false
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(timerSettings.defaultDurationMinutes * 60)
    endTimeRef.current = null
    finishedRef.current = false
  }

  const handlePreset = (minutes: number) => {
    setIsRunning(false)
    setTimeLeft(minutes * 60)
    endTimeRef.current = null
    finishedRef.current = false
  }

  useKeyboardShortcuts({
    onSpace: isActive ? handleStartPause : undefined,
    onR: isActive ? handleReset : undefined,
  })

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-mono relative">
      <div className={`text-[15vw] leading-none font-bold tracking-tighter tabular-nums transition-opacity duration-1000 ${timeLeft === 0 ? 'opacity-20' : 'opacity-100'}`}>
        {formatTime(timeLeft)}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="absolute top-[20%] flex gap-4 pointer-events-auto"
          >
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => handlePreset(m)}
                className="px-4 py-2 rounded-full border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-sans text-sm font-medium"
              >
                {m}m
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
