// Pictures the person uploads, kept in this browser only (IndexedDB): nothing leaves the page. Deleting one, or clearing the site's data,
// removes it. Browser only; IndexedDB can be missing or blocked (a private window), so callers keep an upload for the visit when saving fails.
import type { Upload } from '@kit/peeps-engine'

export const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
export const MAX_BYTES = 5 * 1024 * 1024
/** The long side of an upload in the scene at size 1, about a standing peep's height. */
const LONG = 2800

const DB = 'kit-peeps-creator', STORE = 'uploads'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => { resolve(req.result); d.close() }
    req.onerror = () => { reject(req.error); d.close() }
  })
}

export const loadUploads = (): Promise<Upload[]> => run('readonly', (s) => s.getAll() as IDBRequest<Upload[]>)
export const saveUpload = (u: Upload): Promise<IDBValidKey> => run('readwrite', (s) => s.put(u))
export const deleteUpload = (id: string): Promise<undefined> => run('readwrite', (s) => s.delete(id))

/** Checks the file, reads it as a data URL and measures it. An SVG is only ever drawn as an <image>, where its scripts do not run. */
export async function readUpload(file: File): Promise<Upload> {
  if (!ACCEPT.includes(file.type)) throw new Error(`"${file.name}" is not a PNG, JPEG, WebP, GIF or SVG picture`)
  if (file.size > MAX_BYTES) throw new Error(`"${file.name}" is ${(file.size / 1048576).toFixed(1)} MB; the limit is 5 MB`)
  const href = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
  const img = new Image()
  img.src = href
  await img.decode().catch(() => { throw new Error(`"${file.name}" could not be read as a picture`) })
  // An SVG without its own size reports 0 (or 150 in some browsers); a square is the safest guess.
  const w = img.naturalWidth || 1, h = img.naturalHeight || 1, k = LONG / Math.max(w, h)
  return { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ''), href, width: Math.round(w * k), height: Math.round(h * k) }
}
