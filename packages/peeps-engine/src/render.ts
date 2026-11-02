// A document to an SVG string, in Node, a Worker or a browser: check it, load the paths it needs, draw it as the creator's export does.
import { lookup as lookupFigure } from '@kit/transhumans'
import { exportSceneSvg, exportSvg, fileName } from './export.ts'
import { fallbackBox, peepOf } from './scene.ts'
import { resolve, validate, type DocError, type PeepcraftDoc } from './doc.ts'
import type { CreatorState, SceneEntry } from './types.ts'

/** Thrown by renderSvg for a document that does not validate; `errors` says what and where. */
export class DocInvalid extends Error {
  readonly errors: DocError[]
  constructor(errors: DocError[]) {
    super(errors.map((e) => `${e.path || '(document)'}: ${e.message}`).join('\n'))
    this.name = 'DocInvalid'
    this.errors = errors
  }
}

/** Loads the paths of every atom and figure a state draws. Things are drawn in code and need nothing. A render before this has empty parts. */
export async function load(s: CreatorState): Promise<void> {
  const one = (l: Pick<SceneEntry, 'type' | 'parts' | 'figure' | 'ink' | 'paper' | 'thing'>) =>
    l.thing ? Promise.resolve() : l.figure ? lookupFigure(l.figure).load().then(() => {}) : peepOf(l).load()
  await Promise.all([one(s), ...s.scene.map(one)])
}

/** The picture as an SVG document (1024 on the long side): the scene when it has members, else the peep or figure on its background. */
export async function renderSvg(input: unknown): Promise<{ svg: string; state: CreatorState; doc: PeepcraftDoc }> {
  const checked = validate(input)
  if (!checked.ok) throw new DocInvalid(checked.errors)
  const state = resolve(checked.doc)
  await load(state)
  const svg = state.scene.length ? exportSceneSvg(state) : exportSvg(state, fallbackBox(state))
  return { svg, state, doc: checked.doc }
}

/** The file name a document's picture is saved under, as the creator names its downloads: "bust-afro-smile-tee-1.svg". */
export const nameOf = (s: CreatorState, kind: 'svg' | 'png'): string => fileName(s, s.scene.length > 0, kind)
