import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAlerts } from '../../hooks/useAlerts'

type Phase = 'work' | 'shortBreak' | 'longBreak'

function formatTime(secondsLeft: number) {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function Pomodoro() {
  const { pomodoroSettings, activeMode } = useStore()
  const { triggerAlert } = useAlerts()
  
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

  // Handle settings change mid-flight if stopped
  useEffect(() => {
    if (!isRunning && timeLeft === getDuration(phase)) {
      setTimeLeft(getDuration(phase))
    }
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
  }, [isRunning, timeLeft, phase, round, pomodoroSettings])

  useEffect(() => {
    if (isActive) {
      const phaseName = phase === 'work' ? 'Pomodoro' : 'Break'
      document.title = `${formatTime(timeLeft)} — ${phaseName}`
    }
  }, [timeLeft, isActive, phase])

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

  const handleStartPause = () => setIsRunning(prev => !prev)

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
    <div className="flex flex-col items-center justify-center w-full h-full font-mono">
      <div className="text-xl uppercase tracking-[0.3em] opacity-50 mb-8 font-sans font-medium">
        {phase === 'work' ? 'Focus' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'}
      </div>
      
      <div className={`text-[min(25vw,65vh)] leading-none font-bold tracking-tighter tabular-nums transition-opacity duration-1000 ${timeLeft === 0 ? 'opacity-20' : 'opacity-100'}`}>
        {formatTime(timeLeft)}
      </div>

      <div className="flex gap-4 mt-12 text-2xl">
        {Array.from({ length: pomodoroSettings.roundsBeforeLongBreak }).map((_, i) => (
          <span key={i} className={i < round ? 'opacity-100' : 'opacity-20'}>
            ●
          </span>
        ))}
      </div>
    </div>
  )
}
