// Share links: the document in the URL fragment (`#d=...`), deflated and base64url-encoded. The fragment never reaches a server, so a link
// needs no storage and no backend. CompressionStream('deflate-raw') exists in browsers, Node and Workers, so one encoder serves all three.
import { DocInvalid } from './render.ts'
import { LIMITS, validate, type PeepcraftDoc } from './doc.ts'

/** The key of the fragment: `#d=<payload>`. */
export const SHARE_KEY = 'd'
/** Longest payload a link carries; past it, save the document or the SVG instead. */
export const MAX_SHARE = 8 * 1024

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader()
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    // A small payload can inflate to a lot: stop as soon as it is past what a document may be.
    if (size > limit) { await reader.cancel(); throw new Error(`the shared document is over ${limit} bytes`) }
    parts.push(value)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('a share link carries base64url only')
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** The payload of a share link for a document (what follows `#d=`). */
export async function encodeShare(doc: PeepcraftDoc): Promise<string> {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(doc)), new CompressionStream('deflate-raw')))
}

/** A whole share link: `base` (the page that opens it) with the document in its fragment; null when the document is too big for a link. */
export async function shareUrl(doc: PeepcraftDoc, base: string): Promise<string | null> {
  const payload = await encodeShare(doc)
  return payload.length > MAX_SHARE ? null : `${base.replace(/#.*$/, '')}#${SHARE_KEY}=${payload}`
}

/** The document in a share link: a whole URL, a fragment (`#d=...`) or the payload alone. Throws DocInvalid when it does not validate. */
export async function decodeShare(link: string): Promise<PeepcraftDoc> {
  const hash = link.includes('#') ? link.slice(link.indexOf('#') + 1) : link
  const payload = hash.includes('=') ? new URLSearchParams(hash).get(SHARE_KEY) : hash
  if (!payload) throw new Error(`no document in the link (expected #${SHARE_KEY}=...)`)
  if (payload.length > MAX_SHARE) throw new Error(`a share link carries at most ${MAX_SHARE} characters`)
  let json: unknown
  try { json = JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(payload), new DecompressionStream('deflate-raw'), LIMITS.bytes))) }
  catch (e) { throw new Error(`the link does not hold a document: ${(e as Error).message}`) }
  const checked = validate(json)
  if (!checked.ok) throw new DocInvalid(checked.errors)
  return checked.doc
}
