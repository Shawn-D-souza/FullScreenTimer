import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAlerts } from '../../hooks/useAlerts'
import { useGhostUI } from '../../hooks/useGhostUI'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'

type Phase = 'work' | 'break'

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = []
  if (hours > 0) parts.push(hours.toString().padStart(2, '0'))
  parts.push(minutes.toString().padStart(2, '0'))
  parts.push(seconds.toString().padStart(2, '0'))

  return parts.join(':')
}

export function Flowmodoro() {
  const { activeMode, flowmodoroSettings } = useStore()
  const { triggerAlert, requestNotificationPermission } = useAlerts()
  const { isVisible } = useGhostUI()
  const isActive = activeMode === 'Flowmodoro'

  const [phase, setPhase] = useState<Phase>('work')
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0) // ms for stopwatch, seconds for break
  
  const lastTimeRef = useRef<number | undefined>(undefined)
  const requestRef = useRef<number | undefined>(undefined)
  const endTimeRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  // Work Phase Animation Loop (Stopwatch)
  const animateWork = (timestamp: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = timestamp - lastTimeRef.current
      setTime((prev) => prev + deltaTime)
    }
    lastTimeRef.current = timestamp
    requestRef.current = requestAnimationFrame(animateWork)
  }

  useEffect(() => {
    if (phase === 'work') {
      if (isRunning) {
        requestRef.current = requestAnimationFrame(animateWork)
      } else {
        lastTimeRef.current = undefined
        if (requestRef.current) cancelAnimationFrame(requestRef.current)
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isRunning, phase])

  // Break Phase Loop (Timer)
  useEffect(() => {
    let intervalId: number
    if (phase === 'break' && isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + (time * 1000)
      }

      intervalId = window.setInterval(() => {
        if (!endTimeRef.current) return
        
        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))
        
        setTime(remaining)

        if (remaining === 0 && !finishedRef.current) {
          finishedRef.current = true
          setIsRunning(false)
          endTimeRef.current = null
          
          triggerAlert({
            sound: flowmodoroSettings.alertSound,
            vibration: flowmodoroSettings.alertVibration,
            notificationTitle: 'Break Over',
            notificationBody: 'Ready to flow again?',
          })
          
          setTimeout(() => {
            setPhase('work')
            setTime(0)
            finishedRef.current = false
          }, 1500)
        }
      }, 200)
    } else {
      endTimeRef.current = null
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [isRunning, phase, time, flowmodoroSettings, triggerAlert])

  useEffect(() => {
    if (isActive) {
      const formatted = phase === 'work' ? formatTime(time) : formatTime(time * 1000)
      document.title = `${formatted} — ${phase === 'work' ? 'Flow' : 'Break'}`
    }
  }, [time, isActive, phase])

  const handleStartPause = () => {
    if (!isRunning) {
      requestNotificationPermission()
      triggerAlert({
        sound: false,
        vibration: false,
        notificationTitle: phase === 'work' ? 'Flowmodoro Started' : 'Break Started',
        notificationBody: phase === 'work' ? 'Flow session is running.' : 'Break session is running.',
      })
    }

    if (phase === 'work' && isRunning) {
      // Stopping work means we calculate break and switch to break phase automatically.
      setIsRunning(false)
      const focusSeconds = Math.floor(time / 1000)
      if (focusSeconds > 0) {
        const breakSeconds = Math.max(1, Math.floor(focusSeconds / 5))
        setPhase('break')
        setTime(breakSeconds)
        setTimeout(() => setIsRunning(true), 1000) // auto start break after 1s
      }
    } else {
      setIsRunning(prev => !prev)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setPhase('work')
    setTime(0)
    lastTimeRef.current = undefined
    endTimeRef.current = null
    finishedRef.current = false
  }

  useKeyboardShortcuts({
    onSpace: isActive ? handleStartPause : undefined,
    onR: isActive ? handleReset : undefined,
  })

  const displayTime = phase === 'work' ? formatTime(time) : formatTime(time * 1000)

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-mono relative">
      <div className="text-sm md:text-xl uppercase tracking-[0.3em] opacity-50 mb-4 md:mb-8 font-sans font-medium h-6 md:h-8">
        {phase === 'work' ? (isRunning ? 'Flowing' : '') : 'Break'}
      </div>
      
      <div className="relative flex flex-col items-center justify-center w-full">
        <button 
          onClick={handleStartPause}
          className={`text-[min(18vw,60vh)] leading-none font-bold tracking-tighter tabular-nums transition-opacity duration-200 outline-none hover:opacity-80 ${time === 0 && phase === 'break' ? 'opacity-20' : 'opacity-100'}`}
        >
          {displayTime}
        </button>

        <AnimatePresence>
          {isVisible && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
              className="absolute top-full mt-8 flex gap-4 md:gap-8 pointer-events-auto"
            >
              <button onClick={handleStartPause} className="p-3 md:p-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Start/Pause (Space)">
                {isRunning ? <Pause className="w-6 h-6 md:w-8 md:h-8" /> : <Play className="w-6 h-6 md:w-8 md:h-8" />}
              </button>
              <button onClick={handleReset} className="p-3 md:p-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Reset (R)">
                <RotateCcw className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === 'work' && !isRunning && time > 0 && (
        <div className="mt-8 text-xs md:text-sm opacity-50 font-sans text-center px-4">
          Press Space to calculate break (Focused / 5)
        </div>
      )}
    </div>
  )
}
