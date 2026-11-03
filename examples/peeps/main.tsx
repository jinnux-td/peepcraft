// The host page: the creator alone, filling the window edge to edge.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PeepCreator, type CreatorState, type ThemeId } from '@kit/peeps-creator'
import { decodeShare, resolve, SHARE_KEY, type PeepCraftDoc } from '@kit/peeps-engine'

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

// From photo: the PeepCraft MCP Worker reads the photo with Claude (POST /photo, this page's origin only). Set at build time (build.mjs,
// PHOTO_URL); empty, no button.
declare const PHOTO_URL: string
/** Claude reads an image at up to about 1568 px on its long side; a larger photo only costs more to send. */
const LONG = 1568
async function readPhoto(file: File): Promise<{ doc: PeepCraftDoc; note?: string }> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`"${file.name}" could not be read as a picture.`) })
  const k = Math.min(1, LONG / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  let res: Response
  try { res = await fetch(PHOTO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, mediaType: 'image/jpeg' }) }) }
  catch { throw new Error('The photo reader could not be reached. Check the connection and try again.') }
  const body = await res.json().catch(() => ({})) as { doc?: PeepCraftDoc; people?: string; error?: string }
  // The server's messages are phrases ("no person found in the photo"): shown as a sentence.
  const sentence = (m: string) => m[0].toUpperCase() + m.slice(1) + (m.endsWith('.') ? '' : '.')
  if (!res.ok || !body.doc) throw new Error(body.error ? sentence(body.error) : 'The photo could not be read. Try again later.')
  return { doc: body.doc, note: body.people === 'many' ? 'The photo shows several people: this is the most prominent one.' : undefined }
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(stored)
  const pick = (t: ThemeId) => { setTheme(t); try { localStorage.setItem(KEY, t) } catch { /* the theme just lasts the visit */ } }
  return (
    <div id="full" data-brand={theme}>
      <PeepCreator theme={theme} onThemeChange={pick} defaultState={start} shareBase={location.origin + location.pathname} readPhoto={PHOTO_URL ? readPhoto : undefined} />
      {/* who made it: the creator's portfolio, in the creator's theme */}
      <footer className="made-by"><a href="https://jinnux.com" rel="author">Made by Dat Nguyen</a> · Open Peeps by Pablo Stanley (CC0)</footer>
    </div>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
