import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAlerts } from '../../hooks/useAlerts'
import { useGhostUI } from '../../hooks/useGhostUI'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { formatPomodoroTime } from '../../utils/time'

type Phase = 'work' | 'shortBreak' | 'longBreak'

export function Pomodoro() {
  const { pomodoroSettings, activeMode } = useStore()
  const { triggerAlert, requestNotificationPermission } = useAlerts()
  const { isVisible } = useGhostUI()
  
  const isActive = activeMode === 'Pomodoro'

  const [phase, setPhase] = useState<Phase>('work')
  const [round, setRound] = useState(1) // 1 to roundsBeforeLongBreak
  
  const getDuration = (p: Phase) => {
    if (p === 'work') return pomodoroSettings.workDurationMinutes * 60
    if (p === 'shortBreak') return pomodoroSettings.shortBreakMinutes * 60
    return pomodoroSettings.longBreakMinutes * 60
  }

  const [timeLeft, setTimeLeft] = useState(getDuration('work'))
  const [isRunning, setIsRunning] = useState(false)
  const endTimeRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const handlePhaseEnd = () => {
    setIsRunning(false)
    endTimeRef.current = null
    
    triggerAlert({
      sound: pomodoroSettings.alertSound,
      vibration: pomodoroSettings.alertVibration,
      notificationTitle: phase === 'work' ? 'Focus Session Complete' : 'Break Over',
      notificationBody: 'Time for the next phase.',
    })

    let nextPhase: Phase
    let nextRound = round
    let shouldAutoStart = false

    if (phase === 'work') {
      if (round >= pomodoroSettings.roundsBeforeLongBreak) {
        nextPhase = 'longBreak'
      } else {
        nextPhase = 'shortBreak'
      }
      shouldAutoStart = pomodoroSettings.autoStartBreaks
    } else {
      nextPhase = 'work'
      if (phase === 'longBreak') {
        nextRound = 1
      } else {
        nextRound = round + 1
      }
      shouldAutoStart = pomodoroSettings.autoStartWork
    }

    // Small delay to allow the zero to be seen before resetting
    setTimeout(() => {
      setPhase(nextPhase)
      setRound(nextRound)
      setTimeLeft(getDuration(nextPhase))
      finishedRef.current = false
      if (shouldAutoStart) {
        setIsRunning(true)
      }
    }, 1500)
  }

<<<<<<< Updated upstream
  // Handle settings change mid-flight if stopped
  useEffect(() => {
    if (!isRunning && timeLeft === getDuration(phase)) {
      // It's safe to disable this lint because we want to sync the duration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(getDuration(phase))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroSettings, phase, isRunning])

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

        if (remaining === 0 && !finishedRef.current) {
          finishedRef.current = true
          handlePhaseEnd()
        }
      }, 200)
    } else {
      endTimeRef.current = null
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, timeLeft, phase, round, pomodoroSettings])

  useEffect(() => {
    if (isActive) {
      const phaseName = phase === 'work' ? 'Pomodoro' : 'Break'
      document.title = `${formatPomodoroTime(timeLeft)} — ${phaseName}`
    }
  }, [timeLeft, isActive, phase])

  const handleStartPause = () => {
    if (!isRunning) {
      requestNotificationPermission()
=======
  const handleStartPause = () => {
    if (!isRunning) {
      requestNotificationPermission()
      triggerAlert({
        sound: false,
        vibration: false,
        notificationTitle: phase === 'work' ? 'Pomodoro Started' : 'Break Started',
        notificationBody: phase === 'work' ? 'Focus session is running.' : 'Break session is running.',
      })
>>>>>>> Stashed changes
    }
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setPhase('work')
    setRound(1)
    setTimeLeft(getDuration('work'))
    endTimeRef.current = null
    finishedRef.current = false
  }

  useKeyboardShortcuts({
    onSpace: isActive ? handleStartPause : undefined,
    onR: isActive ? handleReset : undefined,
  })

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-mono relative">
      <div className="text-sm md:text-xl uppercase tracking-[0.3em] opacity-50 mb-4 md:mb-8 font-sans font-medium">
        {phase === 'work' ? 'Focus' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'}
      </div>
      
      <div className="relative flex flex-col items-center justify-center w-full">
        <button 
          onClick={handleStartPause}
          className={`text-[min(24vw,60vh)] leading-none font-bold tracking-tighter tabular-nums transition-opacity duration-200 outline-none hover:opacity-80 ${timeLeft === 0 ? 'opacity-20' : 'opacity-100'}`}
        >
          {formatPomodoroTime(timeLeft)}
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

      <div className="flex gap-2 md:gap-4 mt-8 md:mt-12 text-lg md:text-2xl">
        {Array.from({ length: pomodoroSettings.roundsBeforeLongBreak }).map((_, i) => (
          <span key={i} className={i < round ? 'opacity-100' : 'opacity-20'}>
            ●
          </span>
        ))}
      </div>
    </div>
  )
}
