import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}

// Fontes do Excalidraw (Lousa) vêm do nosso servidor (server/devApi.ts), não de CDN.
window.EXCALIDRAW_ASSET_PATH = `${window.location.origin}/excalidraw-assets/`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
