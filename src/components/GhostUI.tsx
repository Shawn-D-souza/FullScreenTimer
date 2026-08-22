import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGhostUI } from '../hooks/useGhostUI'
import { useStore } from '../store/useStore'
import { Settings as SettingsIcon, Volume2, VolumeX, Keyboard } from 'lucide-react'

interface GhostUIProps {
  children?: ReactNode
  onOpenSettings: () => void
  onOpenShortcuts?: () => void
}

export function GhostUI({ children, onOpenSettings, onOpenShortcuts }: GhostUIProps) {
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

          <div className="pointer-events-auto absolute bottom-8 right-8 flex flex-col gap-4">
            <button 
              onClick={() => setGlobalMute(!globalMute)}
              className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Toggle Mute"
            >
              {globalMute ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            {onOpenShortcuts && (
              <button 
                onClick={onOpenShortcuts}
                className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title="Keyboard Shortcuts"
              >
                <Keyboard size={24} />
              </button>
            )}
            <button 
              onClick={onOpenSettings}
              className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Settings (S)"
            >
              <SettingsIcon size={24} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
