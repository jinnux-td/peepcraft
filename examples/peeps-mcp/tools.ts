// The four tools and the two resources, the same for every protocol version. All read-only: nothing is stored, nothing is fetched.
import { catalog, checkImage, DocInvalid, IMAGE_TYPES, match, nameOf, perceiveRequest, PerceiveError, previewPng, randomDoc, readPerception, renderSvg, search, shareUrl, type DocError, type ImageInput, type PeepCraftDoc } from '@kit/peeps-engine'
import type { PeepType } from '@kit/peeps'
import { docSchema, typeSchema } from './schema.ts'

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
const CATEGORIES = ['head', 'face', 'facialHair', 'mask', 'accessories', 'body', 'standing', 'sitting', 'figure', 'thing']

export const tools = [
  {
    name: 'describe',
    title: 'How a PeepCraft picture is described',
    description: 'Start here. The document format: types, the slots of each type and the category each draws from, defaults, ratios, limits, and an example. Then find ids with search_parts and draw with render.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    annotations: { title: 'Describe the document', ...readOnly },
  },
  {
    name: 'search_parts',
    title: 'Find parts, figures and things',
    description: 'Ids a document can name, with the pieces each can colour. Filter by category (head, face, facialHair, mask, accessories, body = bust torsos, standing and sitting = poses, figure = whole illustrations, thing = props and extras), by the type whose slots to show, and by words in the id or name.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        category: { type: 'string', enum: CATEGORIES },
        type: { ...typeSchema, description: 'Only the categories this type uses, plus figures and things.' },
        query: { type: 'string', description: 'Words to match in the id or name, such as "curly" or "coffee".' },
        limit: { type: 'integer', minimum: 1, maximum: 300, default: 60 },
      },
    },
    annotations: { title: 'Search parts', ...readOnly },
  },
  {
    name: 'render',
    title: 'Draw a PeepCraft picture',
    description: 'Checks the document and draws it as SVG (1024 px on the long side), with a link that opens it in PeepCraft to edit or save as PNG. Set preview to also get a PNG to look at. A bad document returns every problem with its path and the valid choices; fix them and call again.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['doc'], properties: { doc: docSchema, preview: { type: 'boolean', description: 'Also return the picture as a 512 px PNG on white, to check how it looks and for clients that show images. For saving, use the link.' } } },
    annotations: { title: 'Render', ...readOnly },
  },
  {
    name: 'random',
    title: 'A random PeepCraft document',
    description: 'A random document; render it to see it. Only the parts left open roll (body, head, face, facial hair, glasses); the rest is PeepCraft\'s start (a bust, no mask, no extra, its colours) unless keep sets it. A piece colour in keep.partColors for a part left open rolls among the items that have that piece. A keep that contradicts itself is an error. The same seed gives the same document.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { type: typeSchema, seed: { type: 'integer' }, keep: { ...docSchema, description: 'Parts and colours to keep.' } },
    },
    annotations: { title: 'Random document', ...readOnly },
  },
] as const

/** Reading a photo: listed only when the server has a model to send it to (an API key). The photo is sent to the model and not kept. */
export const photoTool = {
  name: 'from_image',
  title: 'A peep that looks like the person in a photo',
  description: 'Reads a photo of one person (hair, facial hair, glasses, expression, clothes, colours; never who they are) and picks the PeepCraft parts that match, then draws it with a link to edit it in PeepCraft. Give an https URL of the image, or its bytes as base64 with the media type. The photo is sent to a vision model and not stored. Another seed gives another of the equally good matches.',
  inputSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      url: { type: 'string', description: 'An https URL of a JPEG, PNG, WebP or GIF image.' },
      data: { type: 'string', description: 'The image as base64, when there is no URL (up to 5 MB).' },
      mediaType: { type: 'string', enum: [...IMAGE_TYPES], description: 'The type of data.' },
      seed: { type: 'integer', description: 'Picks among equally good parts; the same photo and seed give the same peep.' },
    },
  },
  annotations: { title: 'Peep from a photo', readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
} as const

/** The tools this server lists: the four always, from_image when it can read photos. */
export const toolsFor = (photos: boolean) => (photos ? [...tools, photoTool] : tools)

/** Sends a perceive request to a vision model (the Worker's Claude client; a fake in tests). */
export type Perceive = (request: ReturnType<typeof perceiveRequest>) => Promise<{ stop_reason?: string | null; content: readonly { type: string; text?: string }[] }>

export const resources = [
  { uri: 'peepcraft://catalog', name: 'catalog', title: 'PeepCraft catalogue', mimeType: 'application/json', description: 'Every part, figure and thing a document can name, with the pieces each can colour, the slots per type, defaults and limits.' },
  { uri: 'peepcraft://doc-schema', name: 'doc-schema', title: 'PeepCraft document schema', mimeType: 'application/schema+json', description: 'The document as JSON Schema.' },
] as const

export function readResource(uri: string): string | undefined {
  if (uri === 'peepcraft://catalog') return JSON.stringify(catalog())
  if (uri === 'peepcraft://doc-schema') return JSON.stringify(docSchema)
  return undefined
}

export interface ToolResult {
  content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' } | { type: 'resource'; resource: { uri: string; mimeType: string; text: string } })[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

const json = (data: Record<string, unknown>, isError = false): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data, ...(isError ? { isError } : {}) })
const errors = (list: DocError[]): ToolResult => ({
  content: [{ type: 'text', text: `The document has ${list.length} problem${list.length > 1 ? 's' : ''}; fix them and render again:\n${list.map((e) => `- ${e.path || '(document)'}: ${e.message}${e.choices ? ` (choices: ${e.choices.slice(0, 40).join(', ')}${e.choices.length > 40 ? ', ...' : ''})` : ''}`).join('\n')}` }],
  structuredContent: { errors: list }, isError: true,
})

/** The picture as an image block; a picture the preview cannot draw still has its SVG and link. */
async function previewBlock(svg: string): Promise<ToolResult['content']> {
  try {
    const { png } = await previewPng(svg)
    let binary = ''
    for (let i = 0; i < png.length; i += 0x8000) binary += String.fromCharCode(...png.subarray(i, i + 0x8000))
    return [
      ...(svg.includes(' filter="') ? [{ type: 'text' as const, text: 'The preview leaves out the aura\'s glow; the SVG and the link have it.' }] : []),
      { type: 'image', data: btoa(binary), mimeType: 'image/png' },
    ]
  } catch (e) {
    console.error('preview', e)
    return [{ type: 'text', text: 'No preview for this picture; the SVG and the link are fine.' }]
  }
}

/** Runs a tool. An unknown tool is undefined (a protocol error); a bad argument is a tool result with isError, so the model sees it. */
export async function callTool(name: string, args: Record<string, unknown>, base: string, perceive?: Perceive): Promise<ToolResult | undefined> {
  switch (name) {
    case 'describe': {
      const c = catalog()
      return json({
        format: 'A JSON document with "v": 1. Everything else may be left out; { "v": 1 } is the default bust. A non-empty scene makes the picture a scene.',
        types: c.types, slots: c.slots, defaults: c.defaults, ratios: c.ratios, limits: c.limits,
        colours: 'ink is the lines, paper what comes in white, skin the skin; partColors sets single pieces of a worn item (search_parts lists each item\'s pieces).',
        example: { v: 1, type: 'sitting', parts: { head: 'afro', face: 'calm', facialHair: 'full' }, ink: '#1d3557', skin: '#8d5524', bg: '#a8dadc' },
        sceneExample: { v: 1, bg: 'transparent', frame: { ratio: '16:9' }, scene: [{ type: 'standing', parts: { head: 'afro' } }, { figure: 'runner', flip: true }, { thing: 'potted-plant' }] },
      })
    }
    case 'search_parts': {
      const limit = typeof args.limit === 'number' ? Math.min(300, Math.max(1, Math.floor(args.limit))) : 60
      const found = search({ category: args.category as string | undefined, type: args.type as PeepType | undefined, query: args.query as string | undefined })
      return json({ total: found.length, items: found.slice(0, limit) })
    }
    case 'render': {
      try {
        const { svg, state, doc } = await renderSvg(args.doc)
        const fileName = nameOf(state, 'svg'), link = await shareUrl(doc, base)
        return {
          content: [
            { type: 'text', text: `Drew ${fileName} (${Math.round(svg.length / 1024)} KB SVG).${link ? ` Open or edit it in PeepCraft (and save a PNG there): ${link}` : ' Too big for a share link.'}` },
            { type: 'resource', resource: { uri: `peepcraft://render/${fileName}`, mimeType: 'image/svg+xml', text: svg } },
            ...(args.preview === true ? await previewBlock(svg) : []),
          ],
          structuredContent: { fileName, shareUrl: link, bytes: svg.length, doc },
        }
      } catch (e) {
        if (e instanceof DocInvalid) return errors(e.errors)
        throw e
      }
    }
    case 'random': {
      const seed = typeof args.seed === 'number' && Number.isInteger(args.seed) ? args.seed : undefined
      if (args.type !== undefined && !['standing', 'sitting', 'bust'].includes(args.type as string)) return errors([{ path: 'type', message: 'not a type', choices: ['standing', 'sitting', 'bust'] }])
      try { return json({ doc: randomDoc({ type: args.type as PeepType | undefined, keep: args.keep as PeepCraftDoc | undefined, seed }) }) }
      catch (e) {
        if (e instanceof DocInvalid) return errors(e.errors.map((x) => (x.path === 'type' ? x : { ...x, path: `keep${x.path ? `.${x.path}` : ''}` })))
        throw e
      }
    }
    case 'from_image': {
      if (!perceive) return undefined
      const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true })
      const image: ImageInput | undefined = typeof args.url === 'string' ? { url: args.url }
        : typeof args.data === 'string' && typeof args.mediaType === 'string' ? { data: args.data, mediaType: args.mediaType } : undefined
      if (!image) return fail('Give url, or data with mediaType.')
      const seed = typeof args.seed === 'number' && Number.isInteger(args.seed) ? args.seed : 0
      try {
        checkImage(image)
        const { attributes, people } = readPerception(await perceive(perceiveRequest(image)))
        const { doc, reasons } = match(attributes, { seed })
        const { svg, state } = await renderSvg(doc)
        const fileName = nameOf(state, 'svg'), link = await shareUrl(doc, base)
        const why = reasons.map((r) => `${r.slot} ${r.id} (${r.matched.join(', ') || 'closest'})`).join('; ')
        return {
          content: [
            { type: 'text', text: `${people === 'many' ? 'The photo shows several people; this is the most prominent one. ' : ''}Picked: ${why}.${link ? ` Open or edit it in PeepCraft: ${link}` : ''}` },
            { type: 'resource', resource: { uri: `peepcraft://render/${fileName}`, mimeType: 'image/svg+xml', text: svg } },
          ],
          structuredContent: { doc, attributes, reasons, people, shareUrl: link, fileName },
        }
      } catch (e) {
        if (e instanceof PerceiveError) return fail(e.message)
        if (e instanceof DocInvalid) return errors(e.errors)
        // An API failure (a bad key, an outage): said plainly, without the provider's message, which may carry request details.
        console.error('from_image', e)
        return fail('Reading the photo failed on the server; try again later.')
      }
    }
    default: return undefined
  }
}
