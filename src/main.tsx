import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// The service worker only makes sense for the web build. Inside the Capacitor
// shell the assets are bundled, and a stale precache would survive an APK
// update, so skip registration on native.
const isNative = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
if (!isNative && (location.protocol === 'http:' || location.protocol === 'https:')) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
