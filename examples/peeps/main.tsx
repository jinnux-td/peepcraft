// The host page: the creator as a full page, and again inside a narrow dashboard-style panel to show it follows the width of its container.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PeepCreator, type ThemeId } from '@kit/peeps-creator'

const KEY = 'peeps-theme'
const stored = (): ThemeId => {
  try { const t = localStorage.getItem(KEY) as ThemeId | null; if (t) return t } catch { /* private window */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'noir' : 'sunny'
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(stored)
  const pick = (t: ThemeId) => { setTheme(t); try { localStorage.setItem(KEY, t) } catch { /* the theme just lasts the visit */ } }
  return (
    <>
      <div id="full"><PeepCreator theme={theme} onThemeChange={pick} /></div>
      <h3 className="note">The same component in a 560 px dashboard panel</h3>
      <div id="panel" style={{ width: 560, maxWidth: '100%' }}><PeepCreator theme={theme} onThemeChange={pick} title="Avatar" defaultState={{ type: 'sitting', bg: 'transparent' }} /></div>
    </>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
