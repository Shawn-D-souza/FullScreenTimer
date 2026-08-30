/** Service-worker registration, install prompt and screen wake lock. */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installEvent: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()

export function registerServiceWorker(): void {
  // Registering in dev would shadow Vite's module graph with cached assets.
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
  })
}

export function watchInstallPrompt(): () => void {
  const onPrompt = (event: Event) => {
    event.preventDefault()
    installEvent = event as BeforeInstallPromptEvent
    for (const listener of installListeners) listener()
  }
  const onInstalled = () => {
    installEvent = null
    for (const listener of installListeners) listener()
  }

  window.addEventListener('beforeinstallprompt', onPrompt)
  window.addEventListener('appinstalled', onInstalled)

  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt)
    window.removeEventListener('appinstalled', onInstalled)
  }
}

export function subscribeInstallable(listener: () => void): () => void {
  installListeners.add(listener)
  return () => installListeners.delete(listener)
}

export function isInstallable(): boolean {
  return installEvent !== null
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = installEvent
  if (!event) return 'unavailable'
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    installEvent = null
    for (const listener of installListeners) listener()
    return outcome
  } catch {
    return 'dismissed'
  }
}

/* ---------------------------------------------------------------------------
 * Wake lock — for the very common case of leaving this on a second monitor.
 * ------------------------------------------------------------------------- */

interface WakeLockSentinel extends EventTarget {
  released: boolean
  release: () => Promise<void>
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
}

let sentinel: WakeLockSentinel | null = null
let wanted = false

export function supportsWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

async function acquire(): Promise<void> {
  const api = (navigator as unknown as WakeLockNavigator).wakeLock
  if (!api || sentinel) return
  try {
    sentinel = await api.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
      // The browser drops the lock whenever the tab hides; take it back on return.
      if (wanted && !document.hidden) void acquire()
    })
  } catch {
    sentinel = null
  }
}

export function setWakeLock(enabled: boolean): void {
  wanted = enabled
  if (enabled) {
    if (!document.hidden) void acquire()
  } else if (sentinel) {
    void sentinel.release().catch(() => undefined)
    sentinel = null
  }
}

export function watchWakeLock(): () => void {
  const onVisible = () => {
    if (wanted && !document.hidden) void acquire()
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => document.removeEventListener('visibilitychange', onVisible)
}

/* ---------------------------------------------------------------------------
 * Fullscreen
 * ------------------------------------------------------------------------- */

export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null
}

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
  } catch {
    /* denied or unsupported — the app is already effectively fullscreen */
  }
}
