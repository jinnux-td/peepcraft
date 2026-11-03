// The daily cap on photos: one count for the whole server per UTC day, so the money a day of photos can cost has a ceiling, whoever sends
// them. A Durable Object (one instance, by name) holds the count: a read and a write inside one fetch() never interleave with another
// request's, so two photos at the same moment cannot both take the last place. Plain fetch() style, no `cloudflare:workers` import, so the
// tests run in Node with a Map for storage.

interface Storage { get<T>(key: string): Promise<T | undefined>; put<T>(key: string, value: T): Promise<void> }
interface Stub { fetch(url: string): Promise<Response> }
export interface CapNamespace { idFromName(name: string): unknown; get(id: unknown): Stub }

const today = () => new Date().toISOString().slice(0, 10)

export class PhotoCap {
  storage: Storage
  constructor(state: { storage: Storage }) { this.storage = state.storage }
  /** GET ?limit=N: takes a place if one is left today. Answers { ok, used }. */
  async fetch(request: Request): Promise<Response> {
    const limit = Number(new URL(request.url).searchParams.get('limit'))
    const day = today()
    const kept = await this.storage.get<{ day: string; used: number }>('count')
    const used = kept?.day === day ? kept.used : 0
    if (!(used < limit)) return Response.json({ ok: false, used })
    await this.storage.put('count', { day, used: used + 1 })
    return Response.json({ ok: true, used: used + 1 })
  }
}

/** Takes one of today's places; false when the day's photos are used up. Counts before the model call, so a failed call counts too. */
export async function takePlace(ns: CapNamespace, limit: number): Promise<boolean> {
  const res = await ns.get(ns.idFromName('photos')).fetch(`https://cap/?limit=${limit}`)
  return ((await res.json()) as { ok: boolean }).ok
}
