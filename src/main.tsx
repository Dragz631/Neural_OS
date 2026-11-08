import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { iniciarSincronia } from './lib/sincronia'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[]
  }
}

// Fontes do Excalidraw (Lousa) vêm do nosso servidor (server/devApi.ts), não de CDN.
window.EXCALIDRAW_ASSET_PATH = `${window.location.origin}/excalidraw-assets/`

// Primeiro sincroniza com o PC (mesmo progresso no PC e no celular), DEPOIS carrega o app:
// os stores leem os dados assim que são importados. Sem PC por perto, abre só com o navegador.
void iniciarSincronia().finally(async () => {
  await import('./store/tema')
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
