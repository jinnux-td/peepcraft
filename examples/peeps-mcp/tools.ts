// The four tools and the two resources, the same for every protocol version. All read-only: nothing is stored, nothing is fetched.
import { catalog, DocInvalid, nameOf, randomDoc, renderSvg, search, shareUrl, validate, type DocError, type PeepCraftDoc } from '@kit/peeps-engine'
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
    description: 'Checks the document and draws it as SVG (1024 px on the long side), with a link that opens it in PeepCraft to edit or save as PNG. A bad document returns every problem with its path and the valid choices; fix them and call again.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['doc'], properties: { doc: docSchema } },
    annotations: { title: 'Render', ...readOnly },
  },
  {
    name: 'random',
    title: 'A random PeepCraft document',
    description: 'A random document, as PeepCraft\'s Shuffle all makes one; render it to see it. What keep names stays. The same seed gives the same document.',
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: { type: typeSchema, seed: { type: 'integer' }, keep: { ...docSchema, description: 'Parts and colours to keep.' } },
    },
    annotations: { title: 'Random document', ...readOnly },
  },
] as const

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
  content: ({ type: 'text'; text: string } | { type: 'resource'; resource: { uri: string; mimeType: string; text: string } })[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

const json = (data: Record<string, unknown>, isError = false): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data, ...(isError ? { isError } : {}) })
const errors = (list: DocError[]): ToolResult => ({
  content: [{ type: 'text', text: `The document has ${list.length} problem${list.length > 1 ? 's' : ''}; fix them and render again:\n${list.map((e) => `- ${e.path || '(document)'}: ${e.message}${e.choices ? ` (choices: ${e.choices.slice(0, 40).join(', ')}${e.choices.length > 40 ? ', ...' : ''})` : ''}`).join('\n')}` }],
  structuredContent: { errors: list }, isError: true,
})

/** Runs a tool. An unknown tool is undefined (a protocol error); a bad argument is a tool result with isError, so the model sees it. */
export async function callTool(name: string, args: Record<string, unknown>, base: string): Promise<ToolResult | undefined> {
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
      if (args.keep !== undefined) {
        const checked = validate(args.keep)
        if (!checked.ok) return errors(checked.errors.map((e) => ({ ...e, path: `keep${e.path ? `.${e.path}` : ''}` })))
      }
      return json({ doc: randomDoc({ type: args.type as PeepType | undefined, keep: args.keep as PeepCraftDoc | undefined, seed }) })
    }
    default: return undefined
  }
}
