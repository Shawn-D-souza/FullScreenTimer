import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useGhostUI } from '../../hooks/useGhostUI'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { motion, AnimatePresence } from 'framer-motion'

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((ms % 1000) / 10)

  const parts = []
  if (hours > 0) parts.push(hours.toString().padStart(2, '0'))
  parts.push(minutes.toString().padStart(2, '0'))
  parts.push(seconds.toString().padStart(2, '0'))

  return `${parts.join(':')}.${centiseconds.toString().padStart(2, '0')}`
}

export function Stopwatch() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const requestRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number | undefined>(undefined)
  
  const { isVisible } = useGhostUI()
  const { activeMode } = useStore()

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
  }, [isRunning])

  useEffect(() => {
    // Update document title
    if (isActive) {
      document.title = `${formatTime(elapsed)} — Stopwatch`
    }
  }, [elapsed, isActive])

  const handleStartPause = () => setIsRunning(prev => !prev)
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
      <div className="text-[12vw] leading-none font-bold tracking-tighter tabular-nums z-10">
        {formatTime(elapsed)}
      </div>

      <AnimatePresence>
        {isVisible && laps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.8, ease: "easeInOut" } }}
            className="absolute top-[65%] max-h-[25vh] overflow-y-auto w-full max-w-md scrollbar-hide text-center opacity-50"
          >
            {laps.map((lap, index) => {
              const lapDiff = index === laps.length - 1 ? lap : lap - laps[index + 1]
              return (
                <div key={index} className="flex justify-between text-xl py-2 border-b border-black/10 dark:border-white/10 last:border-0 tabular-nums">
                  <span className="opacity-50">Lap {laps.length - index}</span>
                  <span>{formatTime(lapDiff)}</span>
                  <span className="opacity-50">{formatTime(lap)}</span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
