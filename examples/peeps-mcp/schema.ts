// The PeepCraft document as JSON Schema (2020-12), for the inputs of the MCP tools. The engine's validate() is still the judge: it says what
// is wrong and lists the choices, so ids are strings here, with search_parts and describe to find them.
import { LIMITS } from '@kit/peeps-engine'

const colour = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$', description: 'A colour, "#rrggbb".' }
const slots = ['body', 'head', 'face', 'facialHair', 'mask', 'accessories'] as const
const type = { type: 'string', enum: ['standing', 'sitting', 'bust'], description: 'standing (whole figure), sitting, or bust (head and shoulders). Default bust.' }
const range = ([minimum, maximum]: readonly [number, number], description: string) => ({ type: 'number', minimum, maximum, description })

const parts = {
  type: 'object', additionalProperties: false,
  description: 'Part ids by slot; a slot left out takes the default of the type. body is a pose for standing and sitting (categories standing, sitting) and a torso for a bust (category body). Find ids with search_parts.',
  properties: Object.fromEntries(slots.map((s) => [s, { type: 'string' }])),
}
const partColors = {
  type: 'object', additionalProperties: false,
  description: 'Colours of single parts, by slot: { "body": { "top": "#1d3557", "ink": "#3048c8" } }. Keys are ink (its lines), paper (what comes in white) and the pieces the worn item has (search_parts lists them).',
  properties: Object.fromEntries(slots.map((s) => [s, { type: 'object', additionalProperties: colour }])),
}
const extra = {
  type: 'object', additionalProperties: false, required: ['id'],
  description: 'Something the peep wears beside it: a speech, round or thought bubble by the head, or an aura around it (things with extra: true in search_parts).',
  properties: { id: { type: 'string' }, ink: colour, paper: colour },
}
const look = { type, parts, extra, ink: { ...colour, description: 'Lines. Default #111111.' }, paper: { ...colour, description: 'What comes in white (shoes, eyes, lenses). Default #ffffff.' }, skin: { ...colour, description: 'One skin colour for face, neck and hands.' }, partColors, mono: { type: 'boolean', description: 'Black lines on white only.' }, flip: { type: 'boolean' } }

const member = {
  type: 'object', additionalProperties: false,
  description: 'A member of the scene: a peep (the default), a whole figure (figure), or a thing (thing, with colors for its named parts). What is left out comes from the document.',
  properties: {
    ...look,
    figure: { type: 'string', description: 'A whole figure id (search_parts category figure).' },
    thing: { type: 'string', description: 'A thing id (search_parts category thing).' },
    colors: { type: 'object', additionalProperties: colour, description: "Colours of a thing's named parts, such as { \"leaves\": \"#2d6a4f\" }." },
    x: { type: 'number', description: 'Centre from the left in scene units; the scene is 4800 tall and as wide as the ratio makes it. Left out: spread across.' },
    size: range(LIMITS.size, '1 is the default size of its kind.'),
    lift: range(LIMITS.lift, 'Height above the ground, in scene units.'),
  },
}

export const docSchema = {
  type: 'object', additionalProperties: false, required: ['v'],
  description: 'One PeepCraft picture. { "v": 1 } alone is the default bust; add what should differ. With a non-empty scene the picture is the scene.',
  properties: {
    v: { const: 1 },
    ...look,
    figure: { type: ['string', 'null'], description: 'A whole figure (search_parts category figure), drawn instead of the peep.' },
    bg: { type: 'string', pattern: '^(#[0-9a-fA-F]{6}|transparent)$', description: 'Background, "#rrggbb" or "transparent". Default #f7d56e.' },
    scale: range(LIMITS.scale, 'Size of the single peep or figure in its square.'),
    rotate: range(LIMITS.rotate, 'Degrees.'),
    scene: { type: 'array', maxItems: LIMITS.members, items: member, description: 'Members back to front, all standing on one ground line.' },
    frame: {
      type: 'object', additionalProperties: false, description: 'The picture of a scene.',
      properties: { ratio: { type: 'string', enum: ['1:1', '4:3', '3:2', '16:9', '3:4', '9:16'] }, zoom: range(LIMITS.zoom, 'Closer above 1.') },
    },
  },
} as const

export const typeSchema = type
