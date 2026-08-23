import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useGhostUI } from '../../hooks/useGhostUI'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAlerts } from '../../hooks/useAlerts'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Flag } from 'lucide-react'
import { formatStopwatchTime } from '../../utils/time'

export function Stopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const requestRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number | undefined>(undefined)
  
  const { isVisible } = useGhostUI()
  const { activeMode } = useStore()
  const { triggerAlert, requestNotificationPermission } = useAlerts()

  const isActive = activeMode === 'Stopwatch'

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current
      setElapsed((prev) => prev + deltaTime)
    }
    lastTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate)
    } else {
      lastTimeRef.current = undefined
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  useEffect(() => {
    // Update document title
    if (isActive) {
      document.title = `${formatStopwatchTime(elapsed)} — Stopwatch`
    }
  }, [elapsed, isActive])

  const handleStartPause = () => {
    if (!isRunning) {
      requestNotificationPermission()
      triggerAlert({
        sound: false,
        vibration: false,
        notificationTitle: 'Stopwatch Started',
        notificationBody: `${formatStopwatchTime(elapsed)} - Stopwatch is now running.`,
      })
    }
    setIsRunning(prev => !prev)
  }
  const handleReset = () => {
    setIsRunning(false)
    setElapsed(0)
    setLaps([])
    lastTimeRef.current = undefined
  }
  const handleLap = () => {
    if (isRunning) {
      setLaps(prev => [elapsed, ...prev])
    }
  }

  useKeyboardShortcuts({
    onSpace: isActive ? handleStartPause : undefined,
    onR: isActive ? handleReset : undefined,
    onL: isActive ? handleLap : undefined,
  })

  return (
    <div className="flex flex-col items-center justify-center w-full h-full font-mono relative">
      <div className="relative flex flex-col items-center justify-center w-full">
        <button 
          onClick={handleStartPause}
          className="text-[min(14vw,55vh)] leading-none font-bold tracking-tighter tabular-nums z-10 outline-none hover:opacity-80"
        >
          {formatStopwatchTime(elapsed)}
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
              <button onClick={handleLap} className="p-3 md:p-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Lap (L)">
                <Flag className="w-6 h-6 md:w-8 md:h-8" />
              </button>
              <button onClick={handleReset} className="p-3 md:p-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Reset (R)">
                <RotateCcw className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isVisible && laps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="absolute top-[75%] max-h-[20vh] overflow-y-auto w-full max-w-md scrollbar-hide text-center opacity-50 px-4"
          >
            {laps.map((lap, index) => {
              const lapDiff = index === laps.length - 1 ? lap : lap - laps[index + 1]
              return (
                <div key={index} className="flex justify-between text-sm md:text-xl py-2 border-b border-black/10 dark:border-white/10 last:border-0 tabular-nums">
                  <span className="opacity-50">Lap {laps.length - index}</span>
                  <span>{formatStopwatchTime(lapDiff)}</span>
                  <span className="opacity-50">{formatStopwatchTime(lap)}</span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
