import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGhostUI } from '../hooks/useGhostUI'
import { useStore } from '../store/useStore'
import { Settings as SettingsIcon, Volume2, VolumeX, Keyboard, Maximize, Minimize } from 'lucide-react'

interface GhostUIProps {
  children?: ReactNode
  onOpenSettings: () => void
  onOpenShortcuts?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function GhostUI({ children, onOpenSettings, onOpenShortcuts, isFullscreen, onToggleFullscreen }: GhostUIProps) {
  const { isVisible } = useGhostUI()
  const { globalMute, setGlobalMute } = useStore()

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-8"
        >
          {/* Top/Bottom areas can be used for ModeSwitcher which should have pointer-events-auto */}
          <div className="pointer-events-auto">
            {children}
          </div>

          <div className="pointer-events-auto absolute bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col gap-2 md:gap-4">
            {onToggleFullscreen && (
              <button 
                onClick={onToggleFullscreen}
                className="p-2 md:p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-5 h-5 md:w-6 md:h-6" /> : <Maximize className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            )}
            <button 
              onClick={() => setGlobalMute(!globalMute)}
              className="p-2 md:p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Toggle Mute"
            >
              {globalMute ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
            </button>
            {onOpenShortcuts && (
              <button 
                onClick={onOpenShortcuts}
                className="p-2 md:p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
            <button 
              onClick={onOpenSettings}
              className="p-2 md:p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Settings (S)"
            >
              <SettingsIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
