// The host page: the creator alone, filling the window edge to edge.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PeepCreator, type CreatorState, type ThemeId } from '@kit/peeps-creator'
import { decodeShare, resolve, SHARE_KEY } from '@kit/peeps-engine'

const KEY = 'peeps-theme'
const stored = (): ThemeId => {
  try { const t = localStorage.getItem(KEY) as ThemeId | null; if (t) return t } catch { /* private window */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'noir' : 'sunny'
}

// A share link (#d=...) opens its picture. A broken one opens the usual start, and its fragment goes, so a reload does not trip on it again.
async function shared(): Promise<Partial<CreatorState> | undefined> {
  if (!new URLSearchParams(location.hash.slice(1)).has(SHARE_KEY)) return undefined
  try { return resolve(await decodeShare(location.hash)) }
  catch (e) { console.warn('PeepCraft: this link does not open a picture:', (e as Error).message); history.replaceState(null, '', location.pathname + location.search); return undefined }
}
const start = await shared()

function App() {
  const [theme, setTheme] = useState<ThemeId>(stored)
  const pick = (t: ThemeId) => { setTheme(t); try { localStorage.setItem(KEY, t) } catch { /* the theme just lasts the visit */ } }
  return (
    <div id="full" data-brand={theme}>
      <PeepCreator theme={theme} onThemeChange={pick} defaultState={start} shareBase={location.origin + location.pathname} />
      {/* who made it: the creator's portfolio, in the creator's theme */}
      <footer className="made-by"><a href="https://jinnux.com" rel="author">Made by Dat Nguyen</a> · Open Peeps by Pablo Stanley (CC0)</footer>
    </div>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
