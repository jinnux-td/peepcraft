// A photo to a description (Attributes) with a Claude vision model: the request to send and the reading of the reply. No network and no
// SDK here: the caller (the MCP Worker, the CLI) owns the client and the key, sends `perceiveRequest(...)` and passes the reply to
// `readPerception`. The reply is held to a JSON Schema made from the words of the traits, so it can only use words the matcher knows.
//
// What the model is asked to leave out: anything it cannot see ('none' or null), and anything about who the person is (no gender, age,
// ethnicity, or disability). A mobility aid is never read from a photo; a person can still ask for one.
import {
  EYES, EYEWEAR, FACIAL_HAIR, FRAMES, HAIR_LENGTHS, HAIR_STYLES, HAIR_TEXTURES, HEAD_COVERS, MASKS, MOODS, MOUTHS, PATTERNS, POSES,
  BOTTOMS, SIZES, SLEEVES, TOPS,
} from '@kit/peeps'
import type { Attributes } from './match.ts'

/** The default model: the Claude API's default. One setting (PERCEIVE_MODEL in the Worker, --model in the CLI). */
export const PERCEIVE_MODEL = 'claude-opus-5-5'
/** Reading a photo into fixed words is a classification: low effort is enough. */
export const PERCEIVE_EFFORT = 'low'

export type ImageInput = { url: string } | { data: string; mediaType: string }
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
/** The API's limit for one base64 image. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const e = (values: readonly string[], ...more: string[]) => ({ type: 'string', enum: [...values, ...more] })
const flag = { type: 'boolean' }
const colour = (what: string) => ({ anyOf: [{ type: 'string', description: `${what} as #rrggbb, or null when not seen` }, { type: 'null' }] })
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })

/** The reply's JSON Schema: every field required, so the model judges each one; 'none' or null where a thing is not there or not seen. */
export const ATTRIBUTES_SCHEMA = object({
  person: { ...e(['one', 'many', 'none']), description: 'How many people the photo shows. With many, describe the most prominent one.' },
  type: { ...e(['bust', 'standing', 'sitting']), description: 'bust unless the whole body shows.' },
  hair: object({ length: e(HAIR_LENGTHS), texture: e(HAIR_TEXTURES, 'none'), style: e(HAIR_STYLES), bangs: flag, cover: e(HEAD_COVERS, 'none') }),
  face: object({ mood: e(MOODS), eyes: e(EYES), mouth: e(MOUTHS), wrinkles: flag }),
  facialHair: object({ kind: e(FACIAL_HAIR), size: e(SIZES, 'none'), moustache: flag, styled: e(['handlebar', 'horseshoe', 'none']) }),
  eyewear: object({ kind: e(EYEWEAR), frame: e(FRAMES, 'none'), thick: flag, light: flag }),
  mask: e(MASKS),
  outfit: object({
    top: e(TOPS), sleeves: e(SLEEVES), pattern: e(PATTERNS), bottom: e(BOTTOMS, 'none'), pose: e(POSES),
    holds: e(['cup', 'phone', 'laptop', 'controller', 'knife', 'stethoscope', 'none']),
  }),
  colours: object({ skin: colour('Skin'), hair: colour('Hair'), top: colour('The outer garment on the upper body'), bottom: colour('Trousers, jeans or shorts') }),
})

export const PERCEIVE_PROMPT = `Describe the person in this photo for a cartoon avatar, using only the words the schema allows.
- Say what you see, not who the person is: no guesses about gender, age, ethnicity or health.
- A thing that is not there is "none" (no glasses, no facial hair, nothing held). A thing you cannot see is "none" too (the trousers in a head-and-shoulders photo), and a colour you cannot see is null.
- Hair "length" is where it ends: "none" for a bald head, "short" above the ears, "medium" to the chin or shoulders, "long" below the shoulders, "hidden" when a covering hides it.
- Colours are the colours as seen, as #rrggbb.
- If there is no person, set person to "none" and fill the rest with the plainest choices.`

/** The body of a Messages API request (the beta endpoint: it carries the server-side fallback for a declined request). */
export function perceiveRequest(image: ImageInput, { model = PERCEIVE_MODEL, effort = PERCEIVE_EFFORT }: { model?: string; effort?: string } = {}) {
  const source = 'url' in image
    ? { type: 'url' as const, url: image.url }
    : { type: 'base64' as const, media_type: image.mediaType, data: image.data }
  return {
    model,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    output_config: { effort, format: { type: 'json_schema' as const, schema: ATTRIBUTES_SCHEMA } },
    messages: [{ role: 'user' as const, content: [{ type: 'image' as const, source }, { type: 'text' as const, text: PERCEIVE_PROMPT }] }],
  }
}

/** A photo the model could not, or would not, describe. `code` says which, for the caller's message. */
export class PerceiveError extends Error {
  readonly code: 'image' | 'refusal' | 'truncated' | 'no-person' | 'reply' | 'busy'
  constructor(code: PerceiveError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'PerceiveError'
  }
}

/** Checks an image before it is sent: a type the API takes, and a size under its limit. */
export function checkImage(image: ImageInput): void {
  if ('url' in image) {
    if (!/^https:\/\//i.test(image.url)) throw new PerceiveError('image', 'the image URL must start with https://')
    return
  }
  if (!(IMAGE_TYPES as readonly string[]).includes(image.mediaType)) throw new PerceiveError('image', `${image.mediaType} is not one of ${IMAGE_TYPES.join(', ')}`)
  const bytes = Math.floor((image.data.length * 3) / 4)
  if (bytes > MAX_IMAGE_BYTES) throw new PerceiveError('image', `the image is ${(bytes / 1024 / 1024).toFixed(1)} MB; the limit is 5 MB`)
}

interface Reply { stop_reason?: string | null; content: readonly { type: string; text?: string }[] }
export interface Perception { attributes: Attributes; people: 'one' | 'many' }

const HEX = /^#[0-9a-f]{6}$/i

/** The reply as a description: refusals, cut-off replies and photos without a person are errors; colours that are not #rrggbb are left out. */
export function readPerception(reply: Reply): Perception {
  if (reply.stop_reason === 'refusal') throw new PerceiveError('refusal', 'the model declined to describe this photo')
  if (reply.stop_reason === 'max_tokens') throw new PerceiveError('truncated', 'the description was cut off; try again')
  const text = reply.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
  let raw: Record<string, unknown>
  try { raw = JSON.parse(text) } catch { throw new PerceiveError('reply', 'the reply was not JSON') }
  if (raw.person === 'none') throw new PerceiveError('no-person', 'no person found in the photo')
  const { person, colours, ...rest } = raw as unknown as { person: 'one' | 'many'; colours?: Record<string, unknown> } & Attributes
  const kept = Object.fromEntries(Object.entries(colours ?? {}).filter(([, v]) => typeof v === 'string' && HEX.test(v)))
  return { attributes: { ...rest, ...(Object.keys(kept).length ? { colours: kept } : {}) }, people: person }
}
