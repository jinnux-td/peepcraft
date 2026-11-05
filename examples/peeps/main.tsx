// The host page: the creator alone, filling the window edge to edge.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { PeepCreator, type CreatorState, type ThemeId } from '@kit/peeps-creator'
import { dialog, toaster } from '@kit/ui'
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

// From photo needs the visitor's own Anthropic key: kept in this tab only (sessionStorage), and the browser calls Anthropic itself (own-key.ts,
// loaded on first use). PeepCraft's own key is not used: nothing here calls the Worker.
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

async function withOwnKey(key: string, file: File): Promise<Read> {
  const [{ readWithKey }, image] = await Promise.all([ownKeyCode(), shrink(file)])
  try { const { doc, people } = await readWithKey(key, image); return { doc, note: several(people) } }
  catch (e) { throw new Error(sentence((e as Error).message)) }
}

const session = {
  get: () => { try { return sessionStorage.getItem(OWN_KEY) } catch { return null } },
  set: (k: string | null) => { try { if (k) sessionStorage.setItem(OWN_KEY, k); else sessionStorage.removeItem(OWN_KEY) } catch { /* the key lasts until the page closes */ } },
}

/** The visitor's own key, in a @kit/ui dialog (a bottom sheet on a phone), opened from the From photo menu. */
function OwnKeyDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (key: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose
  useEffect(() => {
    const d = dialog(ref.current!)
    const closed = () => { setError(''); onCloseRef.current() }
    ref.current!.addEventListener('close', closed)
    return () => { ref.current?.removeEventListener('close', closed); d.destroy() }
  }, [])
  useEffect(() => { const d = ref.current!; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  const save = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const form = ev.currentTarget, key = String(new FormData(form).get('key') ?? '').trim()
    const { looksLikeKey } = await ownKeyCode()
    if (!looksLikeKey(key)) return setError('That is not an Anthropic API key: those start with sk-ant-api. A Claude Code token (sk-ant-oat…) does not work here.')
    form.reset(); onSave(key); ref.current!.close()
  }
  return (
    <dialog ref={ref} className="k-dialog own-key">
      <form method="dialog" onSubmit={save}>
        <h2 className="k-dialog-title">Use your own Anthropic key</h2>
        <p>From photo needs your own key. The photo and the key go straight to Anthropic, never to PeepCraft, and your Anthropic account pays. The key is kept in this tab only. Give it a key with a spend limit.</p>
        <input className="k-input" name="key" type="password" autoComplete="off" spellCheck={false} required placeholder="sk-ant-api03-…"
          aria-label="Anthropic API key" aria-invalid={!!error || undefined} aria-describedby={error ? 'own-key-error' : undefined} />
        {error && <p id="own-key-error" role="alert" data-warn="">{error}</p>}
        <div className="k-dialog-actions">
          <button className="k-btn" type="button" onClick={() => ref.current!.close()}>Cancel</button>
          <button className="k-btn" data-variant="primary">Use key</button>
        </div>
      </form>
    </dialog>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeId>(stored)
  const pick = (t: ThemeId) => { setTheme(t); try { localStorage.setItem(KEY, t) } catch { /* the theme just lasts the visit */ } }
  const [ownKey, setOwnKey] = useState<string | null>(session.get)
  const keep = (k: string | null) => { setOwnKey(k); session.set(k) }
  const [asking, setAsking] = useState(false)
  const told = (text: string) => toaster().show(text, { kind: 'success' })
  const actions = ownKey ? [{ label: 'Forget my Anthropic key', onSelect: () => { keep(null); told('Your key is forgotten.') } }] : []
  return (
    <div id="full" data-brand={theme}>
      <main><PeepCreator title="PeepCraft" theme={theme} onThemeChange={pick} defaultState={start} shareBase={location.origin + location.pathname}
        readPhoto={(file) => withOwnKey(ownKey!, file)} beforePhoto={ownKey ? undefined : () => setAsking(true)} photoActions={actions} /></main>
      <OwnKeyDialog open={asking} onClose={() => setAsking(false)} onSave={(k) => { keep(k); told('Your own Anthropic key is set, in this tab only. Now choose a photo from the From photo menu.') }} />
      {/* who made it: the creator's portfolio, in the creator's theme */}
      <footer className="made-by"><a href="https://jinnux.com" rel="author">Made by Dat Nguyen</a> · Open Peeps by Pablo Stanley (CC0) · <a href="/privacy">Privacy</a></footer>
    </div>
  )
}

createRoot(document.getElementById('app')!).render(<App />)
