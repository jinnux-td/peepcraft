// What each atom shows, in words a vision model can also say about a photo: hair length and texture, a beard, glasses, an expression, a
// garment. A matcher compares the two to pick parts for a photo. Hand-written from the drawn parts (atoms/ is generated; this file is not),
// so a new atom needs a row here; the tests check that every atom has one and that no row is stale.
//
// Colours are not here: a part's colours are its pieces (atom.pieces), and a part without a `hair` piece draws its hair in ink (black).
import type { Category } from './atom.ts'

// The vocabulary, as lists, so a schema (a vision model's output, the MCP tools) can take the same words as enums.
export const HAIR_LENGTHS = ['none', 'short', 'medium', 'long', 'hidden'] as const
export const HAIR_TEXTURES = ['straight', 'wavy', 'curly', 'coily'] as const
export const HAIR_STYLES = [
  'loose', 'bob', 'bun', 'buns', 'knots', 'ponytail', 'braids', 'locs', 'twists', 'afro',
  'mohawk', 'flat-top', 'quiff', 'side-part', 'crop', 'fade', 'bald', 'balding', 'covered',
] as const
export const HEAD_COVERS = ['hijab', 'turban', 'beanie', 'hat', 'headband', 'costume'] as const

export const MOODS = ['happy', 'neutral', 'confident', 'playful', 'sad', 'worried', 'angry', 'surprised', 'scared', 'tired'] as const
export const EYES = ['open', 'closed', 'narrow', 'wide', 'hearts', 'none'] as const
export const MOUTHS = ['smile', 'grin', 'neutral', 'frown', 'open', 'none'] as const

export const FACIAL_HAIR = ['none', 'moustache', 'goatee', 'beard', 'chinstrap'] as const
export const SIZES = ['small', 'medium', 'large'] as const

export const EYEWEAR = ['none', 'glasses', 'sunglasses', 'eyepatch'] as const
export const FRAMES = ['round', 'rectangle', 'browline', 'cat-eye'] as const
export const MASKS = ['none', 'medical', 'respirator'] as const

export const TOPS = ['tee', 'tank', 'shirt', 'polo', 'sweater', 'turtleneck', 'hoodie', 'jacket', 'blazer', 'dress', 'scrubs', 'lab-coat'] as const
export const SLEEVES = ['none', 'short', 'long'] as const
export const PATTERNS = ['plain', 'stripes', 'dots', 'print', 'graphic'] as const
export const BOTTOMS = ['trousers', 'jeans', 'shorts'] as const
export const POSES = [
  'relaxed', 'hands-on-hips', 'arms-crossed', 'pointing', 'gesturing', 'shrugging', 'walking', 'dancing',
  'knees-up', 'legs-crossed', 'kneeling', 'crouching', 'cross-legged', 'cycling',
] as const
export const AIDS = ['prosthetic-leg', 'wheelchair'] as const

type Of<T extends readonly string[]> = T[number]

export interface HeadTraits {
  /** 'none' for a bald head, 'hidden' when a cover hides the hair. */
  length: Of<typeof HAIR_LENGTHS>
  texture?: Of<typeof HAIR_TEXTURES>
  style: Of<typeof HAIR_STYLES>
  bangs?: true
  cover?: Of<typeof HEAD_COVERS>
}

export interface FaceTraits {
  mood: Of<typeof MOODS>
  eyes: Of<typeof EYES>
  /** 'none': a face drawn without a mouth, to wear under a mask. */
  mouth: Of<typeof MOUTHS>
  wrinkles?: true
  /** Not a human face (one eye, three eyes, fangs): never a match for a photo. */
  fantasy?: true
}

export interface FacialHairTraits {
  kind: Of<typeof FACIAL_HAIR>
  size?: Of<typeof SIZES>
  /** A beard or goatee that comes with a moustache. */
  moustache?: true
  /** A moustache with curled or long ends. */
  styled?: 'handlebar' | 'horseshoe'
}

export interface AccessoryTraits {
  kind: Of<typeof EYEWEAR>
  frame?: Of<typeof FRAMES>
  thick?: true
  /** A light frame (the others are dark). */
  light?: true
}

export interface MaskTraits { kind: Of<typeof MASKS> }

/** A torso (bust) or a whole figure (standing, sitting): what it wears, what it does, what it holds. */
export interface OutfitTraits {
  top: Of<typeof TOPS>
  sleeves: Of<typeof SLEEVES>
  pattern: Of<typeof PATTERNS>
  /** Standing and sitting only. */
  bottom?: Of<typeof BOTTOMS>
  pose: Of<typeof POSES>
  holds?: 'cup' | 'phone' | 'laptop' | 'controller' | 'knife' | 'stethoscope'
  aid?: Of<typeof AIDS>
}

export interface TraitsByCategory {
  head: HeadTraits
  face: FaceTraits
  facialHair: FacialHairTraits
  accessories: AccessoryTraits
  mask: MaskTraits
  body: OutfitTraits
  standing: OutfitTraits
  sitting: OutfitTraits
}

export type Traits = TraitsByCategory[Category]

const head: Record<string, HeadTraits> = {
  'afro':            { length: 'medium', texture: 'coily', style: 'afro' },
  'bangs-2':         { length: 'medium', texture: 'straight', style: 'bob', bangs: true },
  'bangs':           { length: 'medium', texture: 'straight', style: 'bob', bangs: true },
  'bantu-knots':     { length: 'short', texture: 'coily', style: 'knots' },
  'bear':            { length: 'none', style: 'bald', cover: 'costume' },
  'bun-2':           { length: 'long', texture: 'curly', style: 'bun' },
  'bun':             { length: 'medium', texture: 'curly', style: 'bun', cover: 'headband' },
  'buns':            { length: 'medium', texture: 'coily', style: 'buns' },
  'cornrows-2':      { length: 'long', texture: 'coily', style: 'braids' },
  'cornrows':        { length: 'long', texture: 'coily', style: 'braids' },
  'dreads-1':        { length: 'medium', texture: 'coily', style: 'locs' },
  'dreads-2':        { length: 'short', texture: 'coily', style: 'locs' },
  'flat-top-long':   { length: 'short', texture: 'coily', style: 'flat-top' },
  'flat-top':        { length: 'short', texture: 'coily', style: 'flat-top' },
  'gray-bun':        { length: 'medium', texture: 'wavy', style: 'bun' },
  'gray-medium':     { length: 'medium', texture: 'wavy', style: 'loose' },
  'gray-short':      { length: 'short', texture: 'wavy', style: 'side-part' },
  'hat-beanie':      { length: 'short', texture: 'straight', style: 'covered', cover: 'beanie' },
  'hat-hip':         { length: 'hidden', style: 'covered', cover: 'hat' },
  'hijab':           { length: 'hidden', style: 'covered', cover: 'hijab' },
  'long-afro':       { length: 'long', texture: 'coily', style: 'afro' },
  'long-bangs':      { length: 'long', texture: 'wavy', style: 'loose', bangs: true },
  'long-curly':      { length: 'long', texture: 'curly', style: 'loose' },
  'long':            { length: 'long', texture: 'wavy', style: 'loose' },
  'medium-1':        { length: 'medium', texture: 'straight', style: 'bob' },
  'medium-2':        { length: 'medium', texture: 'wavy', style: 'loose' },
  'medium-3':        { length: 'medium', texture: 'straight', style: 'loose' },
  'medium-bangs-2':  { length: 'medium', texture: 'wavy', style: 'ponytail', bangs: true },
  'medium-bangs-3':  { length: 'medium', texture: 'straight', style: 'loose', bangs: true },
  'medium-bangs':    { length: 'medium', texture: 'straight', style: 'bob', bangs: true },
  'medium-straight': { length: 'medium', texture: 'straight', style: 'loose' },
  'mohawk-2':        { length: 'short', texture: 'straight', style: 'mohawk' },
  'mohawk':          { length: 'short', texture: 'straight', style: 'mohawk' },
  'no-hair-1':       { length: 'none', style: 'bald' },
  'no-hair-2':       { length: 'none', style: 'balding' },
  'no-hair-3':       { length: 'none', style: 'balding' },
  'pomp':            { length: 'short', texture: 'wavy', style: 'quiff' },
  'shaved-1':        { length: 'short', texture: 'curly', style: 'fade' },
  'shaved-2':        { length: 'short', texture: 'coily', style: 'fade' },
  'shaved-3':        { length: 'medium', texture: 'wavy', style: 'fade' },
  'short-1':         { length: 'short', texture: 'straight', style: 'side-part' },
  'short-2':         { length: 'short', texture: 'straight', style: 'crop' },
  'short-3':         { length: 'short', texture: 'curly', style: 'crop' },
  'short-4':         { length: 'short', texture: 'wavy', style: 'quiff' },
  'short-5':         { length: 'short', texture: 'curly', style: 'crop' },
  'turban':          { length: 'hidden', style: 'covered', cover: 'turban' },
  'twists-2':        { length: 'short', texture: 'coily', style: 'twists' },
  'twists':          { length: 'short', texture: 'coily', style: 'twists' },
}

const face: Record<string, FaceTraits> = {
  'angry-with-fang':  { mood: 'angry', eyes: 'narrow', mouth: 'neutral' },
  'awe':              { mood: 'surprised', eyes: 'wide', mouth: 'open', wrinkles: true },
  'blank':            { mood: 'neutral', eyes: 'narrow', mouth: 'open' },
  'calm':             { mood: 'happy', eyes: 'closed', mouth: 'smile' },
  'cheeky':           { mood: 'playful', eyes: 'closed', mouth: 'open' },
  'concerned-fear':   { mood: 'scared', eyes: 'closed', mouth: 'open' },
  'concerned':        { mood: 'worried', eyes: 'open', mouth: 'grin' },
  'contempt':         { mood: 'confident', eyes: 'closed', mouth: 'smile' },
  'cute':             { mood: 'happy', eyes: 'closed', mouth: 'smile' },
  'cyclops':          { mood: 'surprised', eyes: 'wide', mouth: 'neutral', fantasy: true },
  'driven':           { mood: 'confident', eyes: 'narrow', mouth: 'smile' },
  'eating-happy':     { mood: 'playful', eyes: 'closed', mouth: 'neutral' },
  'explaining':       { mood: 'neutral', eyes: 'open', mouth: 'open' },
  'eyes-closed':      { mood: 'neutral', eyes: 'closed', mouth: 'neutral' },
  'fear':             { mood: 'scared', eyes: 'wide', mouth: 'neutral' },
  'hectic':           { mood: 'scared', eyes: 'wide', mouth: 'grin' },
  'loving-grin-1':    { mood: 'happy', eyes: 'hearts', mouth: 'open' },
  'loving-grin-2':    { mood: 'happy', eyes: 'hearts', mouth: 'grin' },
  'masked-calm':      { mood: 'neutral', eyes: 'closed', mouth: 'none' },
  'masked-cheers':    { mood: 'happy', eyes: 'closed', mouth: 'none' },
  'masked-smile':     { mood: 'neutral', eyes: 'open', mouth: 'none' },
  'monster':          { mood: 'angry', eyes: 'wide', mouth: 'grin', fantasy: true },
  'old':              { mood: 'neutral', eyes: 'open', mouth: 'neutral', wrinkles: true },
  'rage':             { mood: 'angry', eyes: 'wide', mouth: 'open' },
  'serious':          { mood: 'neutral', eyes: 'narrow', mouth: 'neutral' },
  'smile-big':        { mood: 'happy', eyes: 'closed', mouth: 'grin' },
  'smile-lol':        { mood: 'happy', eyes: 'closed', mouth: 'open' },
  'smile-teeth-gap':  { mood: 'happy', eyes: 'open', mouth: 'grin' },
  'smile':            { mood: 'happy', eyes: 'open', mouth: 'smile' },
  'solemn':           { mood: 'sad', eyes: 'closed', mouth: 'frown' },
  'suspicious':       { mood: 'neutral', eyes: 'narrow', mouth: 'neutral' },
  'tired':            { mood: 'tired', eyes: 'narrow', mouth: 'frown' },
  'very-angry':       { mood: 'angry', eyes: 'narrow', mouth: 'frown' },
}

const facialHair: Record<string, FacialHairTraits> = {
  'chin':         { kind: 'chinstrap', size: 'small' },
  'full-2':       { kind: 'beard', size: 'medium', moustache: true },
  'full-3':       { kind: 'beard', size: 'large', moustache: true },
  'full-4':       { kind: 'beard', size: 'medium', moustache: true },
  'full':         { kind: 'beard', size: 'small', moustache: true },
  'goatee-1':     { kind: 'goatee', size: 'small', moustache: true },
  'goatee-2':     { kind: 'goatee', size: 'medium', moustache: true },
  'moustache-1':  { kind: 'moustache', size: 'small' },
  'moustache-2':  { kind: 'moustache', size: 'large', styled: 'horseshoe' },
  'moustache-3':  { kind: 'moustache', size: 'large', styled: 'handlebar' },
  'moustache-4':  { kind: 'moustache', size: 'small', styled: 'handlebar' },
  'moustache-5':  { kind: 'moustache', size: 'medium' },
  'moustache-6':  { kind: 'moustache', size: 'medium' },
  'moustache-7':  { kind: 'moustache', size: 'small' },
  'moustache-8':  { kind: 'moustache', size: 'large', styled: 'handlebar' },
  'moustache-9':  { kind: 'moustache', size: 'medium' },
  'none':         { kind: 'none' },
}

const accessories: Record<string, AccessoryTraits> = {
  'eyepatch':      { kind: 'eyepatch' },
  'glasses-2':     { kind: 'glasses', frame: 'round' },
  'glasses-3':     { kind: 'glasses', frame: 'browline', thick: true },
  'glasses-4':     { kind: 'glasses', frame: 'cat-eye', thick: true, light: true },
  'glasses-5':     { kind: 'glasses', frame: 'round', thick: true },
  'glasses':       { kind: 'glasses', frame: 'rectangle' },
  'none':          { kind: 'none' },
  'sunglasses-2':  { kind: 'sunglasses', frame: 'browline' },
  'sunglasses':    { kind: 'sunglasses', frame: 'round' },
}

const mask: Record<string, MaskTraits> = {
  'medical-mask': { kind: 'medical' },
  'none':         { kind: 'none' },
  'respirator':   { kind: 'respirator' },
}

const body: Record<string, OutfitTraits> = {
  'blazer-black-tee':   { top: 'blazer', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'button-shirt-1':     { top: 'shirt', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'button-shirt-2':     { top: 'shirt', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'coffee':             { top: 'shirt', sleeves: 'long', pattern: 'plain', pose: 'relaxed', holds: 'cup' },
  'device':             { top: 'sweater', sleeves: 'long', pattern: 'print', pose: 'relaxed', holds: 'phone' },
  'dress':              { top: 'dress', sleeves: 'short', pattern: 'plain', pose: 'relaxed' },
  'explaining':         { top: 'tee', sleeves: 'short', pattern: 'stripes', pose: 'gesturing' },
  'fur-jacket':         { top: 'jacket', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'gaming':             { top: 'hoodie', sleeves: 'long', pattern: 'plain', pose: 'relaxed', holds: 'controller' },
  'gym-shirt':          { top: 'tank', sleeves: 'none', pattern: 'plain', pose: 'relaxed' },
  'hoodie':             { top: 'hoodie', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'killer':             { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'relaxed', holds: 'knife' },
  'macbook':            { top: 'polo', sleeves: 'short', pattern: 'plain', pose: 'relaxed', holds: 'laptop' },
  'paper':              { top: 'sweater', sleeves: 'long', pattern: 'print', pose: 'relaxed', holds: 'phone' },
  'pointing-up':        { top: 'sweater', sleeves: 'long', pattern: 'print', pose: 'pointing' },
  'polka-dot-jacket':   { top: 'blazer', sleeves: 'long', pattern: 'dots', pose: 'pointing' },
  'polo-and-sweater':   { top: 'sweater', sleeves: 'long', pattern: 'print', pose: 'relaxed' },
  'shirt-and-coat':     { top: 'blazer', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'sporty-tee':         { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'relaxed' },
  'striped-pocket-tee': { top: 'tee', sleeves: 'short', pattern: 'graphic', pose: 'hands-on-hips' },
  'striped-tee':        { top: 'tee', sleeves: 'short', pattern: 'stripes', pose: 'relaxed' },
  'sweater-dots':       { top: 'sweater', sleeves: 'long', pattern: 'dots', pose: 'relaxed' },
  'sweater':            { top: 'sweater', sleeves: 'long', pattern: 'dots', pose: 'arms-crossed' },
  'tee-1':              { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'relaxed' },
  'tee-2':              { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'relaxed' },
  'tee-arms-crossed':   { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'arms-crossed' },
  'tee-selena':         { top: 'tee', sleeves: 'short', pattern: 'graphic', pose: 'relaxed' },
  'thunder-t-shirt':    { top: 'tee', sleeves: 'short', pattern: 'graphic', pose: 'relaxed' },
  'turtleneck':         { top: 'turtleneck', sleeves: 'long', pattern: 'plain', pose: 'relaxed' },
  'whatever':           { top: 'tee', sleeves: 'short', pattern: 'plain', pose: 'shrugging' },
}

const standing: Record<string, OutfitTraits> = {
  'blazer-1':           { top: 'blazer', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'hands-on-hips', aid: 'prosthetic-leg' },
  'blazer-2':           { top: 'blazer', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'hands-on-hips', aid: 'prosthetic-leg' },
  'blazer-3':           { top: 'blazer', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'hands-on-hips' },
  'blazer-4':           { top: 'blazer', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'hands-on-hips' },
  'crossed-arms-1':     { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'arms-crossed' },
  'crossed-arms-2':     { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'arms-crossed' },
  'doctor-nurse-1':     { top: 'scrubs', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'relaxed', holds: 'stethoscope' },
  'doctor-nurse-2':     { top: 'lab-coat', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'doctor-nurse-3':     { top: 'scrubs', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'easing-1':           { top: 'shirt', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'easing-2':           { top: 'shirt', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'pointing-finger-1':  { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'pointing' },
  'pointing-finger-2':  { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'pointing' },
  'polka-dots':         { top: 'sweater', sleeves: 'long', pattern: 'dots', bottom: 'trousers', pose: 'relaxed' },
  'resting-1':          { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'resting-2':          { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'robot-dance-1':      { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'dancing' },
  'robot-dance-2':      { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'jeans', pose: 'dancing' },
  'robot-dance-3':      { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'dancing' },
  'shirt-1':            { top: 'shirt', sleeves: 'long', pattern: 'plain', bottom: 'shorts', pose: 'relaxed', aid: 'prosthetic-leg' },
  'shirt-2':            { top: 'shirt', sleeves: 'long', pattern: 'plain', bottom: 'shorts', pose: 'relaxed', aid: 'prosthetic-leg' },
  'shirt-3':            { top: 'shirt', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'shirt-4':            { top: 'shirt', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'relaxed' },
  'walking-1':          { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'walking' },
  'walking-2':          { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'jeans', pose: 'walking' },
  'walking-3':          { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'walking' },
}

const sitting: Record<string, OutfitTraits> = {
  'bike':           { top: 'jacket', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'cycling' },
  'closed-legs-1':  { top: 'jacket', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'knees-up' },
  'closed-legs-2':  { top: 'jacket', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'knees-up' },
  'crossed-legs':   { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'trousers', pose: 'legs-crossed' },
  'hands-back-1':   { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'kneeling' },
  'hands-back-2':   { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'kneeling' },
  'mid-1':          { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'crouching' },
  'mid-2':          { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'crouching' },
  'one-leg-up-1':   { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'cross-legged' },
  'one-leg-up-2':   { top: 'tee', sleeves: 'short', pattern: 'plain', bottom: 'trousers', pose: 'cross-legged' },
  'wheelchair':     { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'jeans', pose: 'relaxed', aid: 'wheelchair' },
}

/** Every atom's traits, by category and id. */
export const traits: { [C in Category]: Readonly<Record<string, TraitsByCategory[C]>> } = {
  head, face, facialHair, accessories, mask, body, standing, sitting,
}

/** The traits of one atom, or undefined for an id without a row. */
export function traitsOf<C extends Category>(category: C, id: string): TraitsByCategory[C] | undefined {
  return Object.hasOwn(traits[category], id) ? traits[category][id] : undefined
}
