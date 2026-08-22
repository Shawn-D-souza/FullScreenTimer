import type { Mode } from '../store/useStore'
import { useStore } from '../store/useStore'

export function ModeSwitcher() {
  const { enabledModes, activeMode, setActiveMode } = useStore()

  if (enabledModes.length <= 1) return null

  return (
    <div className="flex justify-center gap-6 pt-4">
      {enabledModes.map((mode) => (
        <button
          key={mode}
          onClick={() => setActiveMode(mode as Mode)}
          className={`text-lg font-medium tracking-widest uppercase transition-all duration-300 ${
            activeMode === mode 
              ? "opacity-100 border-b-2 border-black dark:border-white pb-1" 
              : "opacity-40 hover:opacity-75 pb-[6px]"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}
