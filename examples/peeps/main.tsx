// The host page: the creator alone, filling the window edge to edge.
import { useState, type FormEvent } from 'react'
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

// From photo: the PeepCraft MCP Worker reads the photo with Claude (POST /photo, this page's origin only, PeepCraft's key and daily cap).
// Set at build time (build.mjs, PHOTO_URL); empty, no button. A visitor may give their own Anthropic key instead: kept in this tab only
// (sessionStorage), and the browser then calls Anthropic itself (own-key.ts, loaded on first use).
declare const PHOTO_URL: string
/** Claude reads an image at up to about 1568 px on its long side; a larger photo only costs more to send. */
const LONG = 1568
const OWN_KEY = 'peeps-own-key'
// A chunk of its own (about 76 KB gzip with the SDK), fetched on first use. The parts' traits it shares with the page ride in the page's
// first download (about 7 KB gzip): esbuild puts a module both reach into a shared chunk.
const ownKeyCode = () => import('./own-key.ts')
type Read = { doc: PeepCraftDoc; note?: string }
// The readers' messages are phrases ("no person found in the photo"): shown as a sentence.
const sentence = (m: string) => m[0].toUpperCase() + m.slice(1) + (/[.!?]$/.test(m) ? '' : '.')
const several = (people?: string) => (people === 'many' ? 'The photo shows several people: this is the most prominent one.' : undefined)

async function shrink(file: File): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`"${file.name}" could not be read as a picture.`) })
  const k = Math.min(1, LONG / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return { data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' }
}

async function viaWorker(file: File): Promise<Read> {
  const image = await shrink(file)
  let res: Response
  try { res = await fetch(PHOTO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image) }) }
  catch { throw new Error('The photo reader could not be reached. Check the connection and try again.') }
  const body = await res.json().catch(() => ({})) as { doc?: PeepCraftDoc; people?: string; error?: string; code?: string }
  if (!res.ok || !body.doc) {
    const said = body.error ? sentence(body.error) : 'The photo could not be read. Try again later.'
    throw new Error(body.code === 'quota' ? `${said} Or use your own Anthropic key below.` : said)
  }
  return { doc: body.doc, note: several(body.people) }
}

async function withOwnKey(key: string, file: File): Promise<Read> {
  const [{ readWithKey }, image] = await Promise.all([ownKeyCode(), shrink(file)])
  try { const { doc, people } = await readWithKey(key, image); return { doc, note: several(people) } }
  catch (e) { throw new Error(sentence((e as Error).message)) }
}

const session = {
  get: () => { try { return sessionStorage.getItem(OWN_KEY) } catch { return null } },
  set: (k: string | null) => { try { if (k) sessionStorage.setItem(OWN_KEY, k); else sessionStorage.removeItem(OWN_KEY) } catch { /* the key lasts until the page closes */ } },
}

/** The visitor's own key: a small button that opens a form; with a key, a line that says so and a Forget button. */
function OwnKey({ value, onChange }: { value: string | null; onChange: (key: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  if (value) return (
    <div className="own-key"><span>Photos are read with your own Anthropic key, in this tab only.</span>
      <button className="k-btn" data-variant="ghost" data-size="sm" onClick={() => onChange(null)}>Forget key</button></div>
  )
  if (!open) return <div className="own-key"><button className="k-btn" data-variant="ghost" data-size="sm" aria-expanded="false" onClick={() => setOpen(true)}>Use my own Anthropic key</button></div>
  const save = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const key = String(new FormData(ev.currentTarget).get('key') ?? '').trim()
    const { looksLikeKey } = await ownKeyCode()
    if (!looksLikeKey(key)) return setError('That is not an Anthropic API key: those start with sk-ant-api. A Claude Code token (sk-ant-oat…) does not work here.')
    setError(''); setOpen(false); onChange(key)
  }
  return (
    <form className="own-key" onSubmit={save} aria-label="Your own Anthropic key">
      <input className="k-input" data-size="sm" name="key" type="password" autoComplete="off" spellCheck={false} autoFocus required
        placeholder="sk-ant-api03-…" aria-label="Anthropic API key" aria-invalid={!!error || undefined} aria-describedby="own-key-help" />
      <button className="k-btn" data-variant="primary" data-size="sm">Use key</button>
      <button className="k-btn" type="button" data-variant="ghost" data-size="sm" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      <p id="own-key-help" role={error ? 'alert' : undefined} data-warn={error ? '' : undefined}>{error || 'Kept in this tab only and sent straight to Anthropic, never to PeepCraft. Your Anthropic account pays; give it a key with a spend limit.'}</p>
    </form>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(stored)
  const pick = (t: ThemeId) => { setTheme(t); try { localStorage.setItem(KEY, t) } catch { /* the theme just lasts the visit */ } }
  const [ownKey, setOwnKey] = useState<string | null>(session.get)
  const keep = (k: string | null) => { setOwnKey(k); session.set(k) }
  const readPhoto = !PHOTO_URL ? undefined : ownKey ? (file: File) => withOwnKey(ownKey, file) : viaWorker
  return (
    <div id="full" data-brand={theme}>
      <PeepCreator theme={theme} onThemeChange={pick} defaultState={start} shareBase={location.origin + location.pathname}
        readPhoto={readPhoto} photoExtra={<OwnKey value={ownKey} onChange={keep} />} />
      {/* who made it: the creator's portfolio, in the creator's theme */}
      <footer className="made-by"><a href="https://jinnux.com" rel="author">Made by Dat Nguyen</a> · Open Peeps by Pablo Stanley (CC0)</footer>
    </div>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
