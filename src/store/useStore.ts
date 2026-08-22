import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Mode = 'Clock' | 'Stopwatch' | 'Timer' | 'Pomodoro' | 'Flowmodoro'

export interface TimerPreset {
  label: string
  minutes: number
}

interface State {
  // General Settings
  theme: 'dark' | 'light'
  globalMute: boolean
  idleTimeoutSeconds: number // 0 means never
  activeMode: Mode
  enabledModes: Mode[]

  // Mode Settings
  clockSettings: {
    showSeconds: boolean
    use24Hour: boolean
  }
  
  stopwatchSettings: {
    lapAlertVibration: boolean
    lapAlertSound: boolean
  }

  timerSettings: {
    defaultDurationMinutes: number
    autoReset: boolean
    alertSound: boolean
    alertVibration: boolean
  }

  pomodoroSettings: {
    workDurationMinutes: number
    shortBreakMinutes: number
    longBreakMinutes: number
    roundsBeforeLongBreak: number
    autoStartBreaks: boolean
    autoStartWork: boolean
    alertSound: boolean
    alertVibration: boolean
  }

  flowmodoroSettings: {
    alertSound: boolean
    alertVibration: boolean
  }

  tipsSeen: Record<string, boolean>
  
  // Actions
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setGlobalMute: (mute: boolean) => void
  setIdleTimeout: (seconds: number) => void
  setActiveMode: (mode: Mode) => void
  setEnabledModes: (modes: Mode[]) => void
  updateClockSettings: (settings: Partial<State['clockSettings']>) => void
  updateStopwatchSettings: (settings: Partial<State['stopwatchSettings']>) => void
  updateTimerSettings: (settings: Partial<State['timerSettings']>) => void
  updatePomodoroSettings: (settings: Partial<State['pomodoroSettings']>) => void
  updateFlowmodoroSettings: (settings: Partial<State['flowmodoroSettings']>) => void
  markTipSeen: (tipId: string, seen: boolean) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      theme: 'dark',
      globalMute: false,
      idleTimeoutSeconds: 3,
      activeMode: 'Timer',
      enabledModes: ['Clock', 'Stopwatch', 'Timer', 'Pomodoro', 'Flowmodoro'],

      clockSettings: {
        showSeconds: true,
        use24Hour: false,
      },

      stopwatchSettings: {
        lapAlertVibration: true,
        lapAlertSound: true,
      },

      timerSettings: {
        defaultDurationMinutes: 5,
        autoReset: false,
        alertSound: true,
        alertVibration: true,
      },

      pomodoroSettings: {
        workDurationMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 20,
        roundsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        alertSound: true,
        alertVibration: true,
      },

      flowmodoroSettings: {
        alertSound: true,
        alertVibration: true,
      },

      tipsSeen: {},

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setGlobalMute: (mute) => set({ globalMute: mute }),
      setIdleTimeout: (seconds) => set({ idleTimeoutSeconds: seconds }),
      setActiveMode: (mode) => set({ activeMode: mode }),
      setEnabledModes: (modes) => set({ enabledModes: modes }),
      updateClockSettings: (settings) => set((state) => ({ clockSettings: { ...state.clockSettings, ...settings } })),
      updateStopwatchSettings: (settings) => set((state) => ({ stopwatchSettings: { ...state.stopwatchSettings, ...settings } })),
      updateTimerSettings: (settings) => set((state) => ({ timerSettings: { ...state.timerSettings, ...settings } })),
      updatePomodoroSettings: (settings) => set((state) => ({ pomodoroSettings: { ...state.pomodoroSettings, ...settings } })),
      updateFlowmodoroSettings: (settings) => set((state) => ({ flowmodoroSettings: { ...state.flowmodoroSettings, ...settings } })),
      markTipSeen: (tipId, seen) => set((state) => ({ tipsSeen: { ...state.tipsSeen, [tipId]: seen } })),
    }),
    {
      name: 'monochrome-storage',
    }
  )
)
