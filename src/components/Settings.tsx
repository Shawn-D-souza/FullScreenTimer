import { useStore } from '../store/useStore'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const store = useStore()
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-50 bg-white dark:bg-black text-black dark:text-white overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto p-8 md:p-16">
        <div className="flex justify-between items-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X size={32} />
          </button>
        </div>

        <div className="grid gap-16 font-sans">
          
          <section>
            <h2 className="text-2xl font-bold mb-6 border-b border-black/10 dark:border-white/10 pb-4">General</h2>
            <div className="grid gap-6">
              <label className="flex items-center justify-between">
                <span>Theme</span>
                <select 
                  className="bg-transparent border border-black/20 dark:border-white/20 p-2 rounded"
                  value={store.theme}
                  onChange={(e) => store.setTheme(e.target.value as 'dark' | 'light')}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>

              <label className="flex items-center justify-between">
                <span>Ghost UI Idle Timeout</span>
                <select 
                  className="bg-transparent border border-black/20 dark:border-white/20 p-2 rounded"
                  value={store.idleTimeoutSeconds}
                  onChange={(e) => store.setIdleTimeout(Number(e.target.value))}
                >
                  <option value={2}>2 seconds</option>
                  <option value={3}>3 seconds</option>
                  <option value={5}>5 seconds</option>
                  <option value={0}>Never hide</option>
                </select>
              </label>

              <label className="flex items-center justify-between">
                <span>Global Mute</span>
                <input 
                  type="checkbox" 
                  className="w-6 h-6 accent-black dark:accent-white"
                  checked={store.globalMute}
                  onChange={(e) => store.setGlobalMute(e.target.checked)}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 border-b border-black/10 dark:border-white/10 pb-4">Shortcuts</h2>
            <div className="grid grid-cols-2 gap-4 opacity-75">
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Start / Pause</span> <kbd>Space</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Reset</span> <kbd>R</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Next Mode</span> <kbd>Tab</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Previous Mode</span> <kbd>Shift+Tab</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Settings</span> <kbd>S</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Toggle Theme</span> <kbd>D</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Toggle Fullscreen</span> <kbd>F</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Add Lap (Stopwatch)</span> <kbd>L</kbd></div>
              <div className="flex justify-between border-b border-black/10 dark:border-white/10 py-2"><span>Shortcuts</span> <kbd>?</kbd></div>
            </div>
          </section>

          {/* Add more sections for Pomodoro/Timer settings as needed for MVP */}
          
        </div>
      </div>
    </motion.div>
  )
}
