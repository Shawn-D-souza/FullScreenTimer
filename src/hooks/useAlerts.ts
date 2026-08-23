import { useCallback } from 'react'
import { useStore } from '../store/useStore'

export function useAlerts() {
  const globalMute = useStore((state) => state.globalMute)

  const playSound = useCallback(() => {
    if (globalMute) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5) // A4
      
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.5)
    } catch (e) {
      console.error('Audio playback failed', e)
    }
  }, [globalMute])

  const triggerVibration = useCallback((pattern: number | number[] = 200) => {
    if (globalMute) return
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [globalMute])

  const showNotification = useCallback((title: string, body: string) => {
    if (globalMute) return
    if (!('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.showNotification(title, { body })
          } else {
            try {
              new Notification(title, { body })
            } catch (e) {
              console.error('Failed to show notification', e)
            }
          }
        }).catch((err) => {
          console.error('Error getting service worker registration', err)
          try {
            new Notification(title, { body })
          } catch (e) {
            console.error('Failed to show notification', e)
          }
        })
      } else {
        try {
          new Notification(title, { body })
        } catch (e) {
          console.error('Failed to show notification', e)
        }
      }
    }
  }, [globalMute])

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const triggerAlert = useCallback(({ 
    sound = true, 
    vibration = true, 
    vibratePattern = 200,
    notificationTitle,
    notificationBody
  }: { 
    sound?: boolean, 
    vibration?: boolean, 
    vibratePattern?: number | number[],
    notificationTitle?: string,
    notificationBody?: string
  }) => {
    if (sound) playSound()
    if (vibration) triggerVibration(vibratePattern)
    if (notificationTitle && notificationBody) {
      showNotification(notificationTitle, notificationBody)
    }
  }, [playSound, triggerVibration, showNotification])

  return { triggerAlert, playSound, triggerVibration, showNotification, requestNotificationPermission }
}
