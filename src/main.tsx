import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/rajdhani/latin-500.css'
import '@fontsource/rajdhani/latin-700.css'
import '@fontsource/saira-stencil-one/latin-400.css'
import '@fontsource/oswald/latin-600.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/vt323/latin-400.css'
import './index.css'
import App from './App.tsx'
import { bodyThemeVars } from './ui/bodyTheme'

// Couleurs du schéma du corps (variables --bm-*), disponibles partout : planche, légende, barres.
for (const [k, v] of Object.entries(bodyThemeVars())) document.documentElement.style.setProperty(k, String(v))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
