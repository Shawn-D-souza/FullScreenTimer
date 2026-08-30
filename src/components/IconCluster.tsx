import { useEffect, useState } from 'react'
import {
  Download,
  Keyboard,
  Maximize,
  Minimize,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { isInstallable, promptInstall, subscribeInstallable } from '../lib/pwa'
import {
  openSettings,
  requestFullscreen,
  toggleMute,
  toggleShortcuts,
} from '../state/controller'
import { useSettings } from '../state/settings'
import { useUi } from '../state/ui'
import { requestTip, useTips } from '../state/tips'
import { GhostButton } from './GhostButton'

const ICON = { size: 17, strokeWidth: 1.5 } as const

/** Install, mute, shortcuts, fullscreen, settings — in that order of rarity. */
export function IconCluster() {
  const muted = useSettings((state) => state.general.globalMute)
  const fullscreen = useUi((state) => state.fullscreen)
  const installable = useInstallable()

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {installable ? (
        <GhostButton
          variant="icon"
          aria-label="Install FullScreenTimer"
          title="Install"
          onClick={() => {
            useTips.getState().suppress('install')
            void promptInstall()
          }}
        >
          <Download {...ICON} />
        </GhostButton>
      ) : null}

      <GhostButton
        variant="icon"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        title={muted ? 'Muted — M' : 'Mute — M'}
        onClick={toggleMute}
      >
        {muted ? <VolumeX {...ICON} /> : <Volume2 {...ICON} />}
      </GhostButton>

      <GhostButton
        variant="icon"
        aria-label="Keyboard shortcuts"
        title="Shortcuts — ?"
        onClick={toggleShortcuts}
      >
        <Keyboard {...ICON} />
      </GhostButton>

      <GhostButton
        variant="icon"
        aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
        title="Fullscreen — F"
        onClick={requestFullscreen}
      >
        {fullscreen ? <Minimize {...ICON} /> : <Maximize {...ICON} />}
      </GhostButton>

      <GhostButton variant="icon" aria-label="Settings" title="Settings — S" onClick={openSettings}>
        <Settings {...ICON} />
      </GhostButton>
    </div>
  )
}

/** The install prompt arrives whenever the browser feels like it, if at all. */
function useInstallable(): boolean {
  const [installable, setInstallable] = useState(isInstallable)

  useEffect(() => subscribeInstallable(() => setInstallable(isInstallable())), [])

  useEffect(() => {
    if (installable) requestTip('install')
  }, [installable])

  return installable
}
