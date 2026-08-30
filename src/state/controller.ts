import type { ModeId } from './schema'
import { MODE_LABELS } from './schema'
import { readSettings, selectVisibleModes, useSettings } from './settings'
import { useSession } from './session'
import { useUi } from './ui'
import { requestTip } from './tips'
import { unlockAudio } from '../lib/audio'
import { notificationPermission, requestNotificationPermission } from '../lib/notifications'
import { toggleFullscreen } from '../lib/pwa'
import * as ticker from '../lib/ticker'

/**
 * User intent lives here rather than in components, so a keypress and a click on
 * the same control cannot drift apart — and so the handful of side effects that
 * must happen inside a real user gesture (unlocking audio, asking for
 * notification permission) happen exactly once, in the right place.
 */

function isCountdownRunning(mode: ModeId): boolean {
  const state = useSession.getState()
  switch (mode) {
    case 'timer':
      return state.timer.status === 'running'
    case 'pomodoro':
      return state.pomodoro.status === 'running'
    case 'flowmodoro':
      return state.flow.stage === 'break' && state.flow.breakStatus === 'running'
    default:
      return false
  }
}

/**
 * Permission is asked for the first time the user starts something that can
 * finish while they are looking elsewhere — never on load.
 */
function maybeRequestNotifications(): void {
  const settings = readSettings()
  if (!settings.notifications.master) return
  const permission = notificationPermission()
  if (permission === 'default') {
    requestTip('notifications')
    void requestNotificationPermission()
  }
}

export function primaryAction(): void {
  unlockAudio()

  const mode = useSession.getState().activeMode
  const wasRunning = isCountdownRunning(mode)

  useSession.getState().toggle()
  ticker.poke()

  if (!wasRunning && isCountdownRunning(mode)) maybeRequestNotifications()

  const state = useSession.getState()
  if (mode === 'stopwatch' && state.stopwatch.running) requestTip('lap')
  if (mode === 'pomodoro' && state.pomodoro.status === 'running') requestTip('pomodoro-rounds')
  requestTip('shortcuts')
}

export function resetActive(): void {
  unlockAudio()
  useSession.getState().reset()
  ticker.poke()
}

export function recordLap(): void {
  unlockAudio()
  useSession.getState().lap()
  ticker.poke()
}

export function switchMode(mode: ModeId): void {
  useSession.getState().setActiveMode(mode)
  ticker.poke()
  afterModeChange(mode)
}

export function cycleMode(delta: 1 | -1): void {
  useSession.getState().cycleMode(delta)
  ticker.poke()
  afterModeChange(useSession.getState().activeMode)
}

/** Jump straight to the n-th visible mode (1-indexed) — used by the number keys. */
export function switchModeByIndex(index: number): void {
  const visible = selectVisibleModes(readSettings())
  const mode = visible[index - 1]
  if (mode) switchMode(mode)
}

function afterModeChange(mode: ModeId): void {
  requestTip('modes')
  if (mode === 'flowmodoro') requestTip('flowmodoro')
  if (mode === 'timer') requestTip('timer-adjust')
  useUi.getState().announce(MODE_LABELS[mode])
}

export function startPreset(ms: number): void {
  unlockAudio()
  useSession.getState().startTimerWith(ms)
  ticker.poke()
  maybeRequestNotifications()
}

export function adjustTimer(deltaMs: number): void {
  useSession.getState().adjustTimerDuration(deltaMs)
  ticker.poke()
}

export function skipPhase(): void {
  useSession.getState().skipPhase()
  ticker.poke()
}

export function toggleMute(): void {
  useSettings.getState().toggleMute()
  if (readSettings().general.globalMute) requestTip('muted')
}

export function toggleTheme(): void {
  useSettings.getState().toggleTheme()
}

export function toggleChrome(): void {
  useUi.getState().toggleChromeLock()
  if (useUi.getState().chromeLocked) requestTip('chrome-hidden')
}

export function openSettings(): void {
  useUi.getState().setSettingsOpen(true)
}

export function toggleShortcuts(): void {
  const ui = useUi.getState()
  ui.setShortcutsOpen(!ui.shortcutsOpen)
}

export function requestFullscreen(): void {
  void toggleFullscreen()
}
