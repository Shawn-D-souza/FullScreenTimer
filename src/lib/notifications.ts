/**
 * Browser notifications.
 *
 * Permission is requested contextually — the first time the user starts something
 * that can finish while they are looking elsewhere — never on load.
 */

export type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function notificationPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

let requestInFlight: Promise<PermissionState> | null = null

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  if (requestInFlight) return requestInFlight

  requestInFlight = Notification.requestPermission()
    .then((result) => result as PermissionState)
    .catch(() => 'denied' as PermissionState)
    .finally(() => {
      requestInFlight = null
    })

  return requestInFlight
}

export interface NotifyOptions {
  title: string
  body?: string
  tag: string
  silent?: boolean
}

export function notify({ title, body, tag, silent = true }: NotifyOptions): void {
  if (notificationPermission() !== 'granted') return

  const options: NotificationOptions = {
    body,
    tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // The app plays its own tone; letting the OS add one too is jarring.
    silent,
    requireInteraction: false,
  }

  // A service-worker notification is the only kind Android will show, and it
  // survives the page being frozen. Fall back to the page-level constructor.
  const controller = navigator.serviceWorker?.controller
  if (controller) {
    void navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => spawnDirect(title, options))
    return
  }

  spawnDirect(title, options)
}

function spawnDirect(title: string, options: NotificationOptions): void {
  try {
    const notification = new Notification(title, options)
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    /* Android throws here by design; nothing more we can do */
  }
}
