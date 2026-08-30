import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { registerServiceWorker, watchInstallPrompt } from './lib/pwa'
import { useSession } from './state/session'
import { requestTip } from './state/tips'

/* Boot work that has nothing to do with rendering, done once, outside React. */
registerServiceWorker()
watchInstallPrompt()

// Settings and the last session have already rehydrated from localStorage by now,
// so the app can open on the right mode without a flash of the wrong one.
useSession.getState().applyStartupMode()
useSession.getState().syncFromSettings()
requestTip('welcome')

const container = document.getElementById('root')
if (!container) throw new Error('#root is missing from the document')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
