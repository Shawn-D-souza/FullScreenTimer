import { useEffect, useState } from 'react'
import { ALERTING_MODE_IDS, MODE_LABELS } from '../../state/schema'
import { useSettings } from '../../state/settings'
import {
  notificationPermission,
  requestNotificationPermission,
  type PermissionState,
} from '../../lib/notifications'
import { Row, Section, Toggle } from './controls'
import { GhostButton } from '../GhostButton'

export function NotificationsSection() {
  const notifications = useSettings((state) => state.notifications)
  const update = useSettings((state) => state.update)
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)

  // The browser can revoke this from its own UI while the app is open.
  useEffect(() => {
    const sync = () => setPermission(notificationPermission())
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  return (
    <Section
      title="Notifications"
      description="A notification is what reaches you when the app is in another tab. The alarm sound plays either way."
    >
      <Row
        label="Send notifications"
        hint={HINTS[permission]}
        align="start"
      >
        {permission === 'default' ? (
          <GhostButton
            onClick={() => {
              void requestNotificationPermission().then(setPermission)
            }}
          >
            Allow
          </GhostButton>
        ) : null}
        <Toggle
          label="Send notifications"
          checked={notifications.master}
          disabled={permission === 'denied' || permission === 'unsupported'}
          onChange={(master) =>
            update((draft) => {
              draft.notifications.master = master
            })
          }
        />
      </Row>

      {ALERTING_MODE_IDS.map((mode) => (
        <Row key={mode} label={MODE_LABELS[mode]}>
          <Toggle
            label={`Notify for ${MODE_LABELS[mode]}`}
            checked={notifications.perMode[mode]}
            disabled={!notifications.master || permission !== 'granted'}
            onChange={(value) =>
              update((draft) => {
                draft.notifications.perMode[mode] = value
              })
            }
          />
        </Row>
      ))}
    </Section>
  )
}

const HINTS: Record<PermissionState, string> = {
  unsupported: 'This browser does not support notifications.',
  default: 'The browser has not been asked yet.',
  granted: 'Allowed by the browser.',
  denied: 'Blocked in the browser — change it in the address bar, then reload.',
}
