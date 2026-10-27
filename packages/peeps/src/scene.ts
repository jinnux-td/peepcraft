// A scene puts a background and many items (peeps, whole figures, later cars or animals) on one canvas, back to front, in one SVG.
import { createElement, type ReactElement, type SVGProps } from 'react'
import { Background } from './background.ts'

/** Something that draws itself: a Peep, or another Scene. */
export interface Drawable {
  readonly size: { width: number; height: number }
  group(props?: SVGProps<SVGGElement>): ReactElement
}

/** A component with its canvas size that takes ink and paper: an atom, or a figure of @kit/transhumans (same shape, no import needed). */
export type Art = ((props: { ink?: string; paper?: string }) => ReactElement) & { width: number; height: number }

export interface Placement {
  /** Top-left corner of the item's canvas, in scene units. */
  x?: number
  y?: number
  /** Instead of `y`: where the bottom of the item's canvas lands (a floor every item can stand on). */
  ground?: number
  /** 1 keeps the item's own units. Peeps (about 3300 tall standing) and figures (1080) differ, so scale one to match the other. */
  scale?: number
  /** Instead of `scale`: the height the item's canvas takes in the scene. Canvases have air around the art, so equal heights can look unequal. */
  fitHeight?: number
  /** Mirror left to right, inside the same box. */
  flip?: boolean
  /** Colours of an Art item; a Drawable keeps its own. */
  ink?: string
  paper?: string
}

export interface SceneItem { item: Drawable | Art; at: Required<Pick<Placement, 'x' | 'y' | 'scale' | 'flip'>> & Pick<Placement, 'ink' | 'paper'> }

const sizeOf = (item: Drawable | Art): { width: number; height: number } => (typeof item === 'function' ? item : item.size)

export interface SceneOptions {
  width: number
  height: number
  /** A colour, a Background, or nothing (transparent). */
  background?: string | Background
}

export class Scene implements Drawable {
  readonly width: number
  readonly height: number
  readonly background: Background
  readonly items: SceneItem[] = []

  constructor({ width, height, background }: SceneOptions) {
    if (!(width > 0 && height > 0)) throw new Error(`a scene needs a positive width and height, got ${width} x ${height}`)
    this.width = width
    this.height = height
    this.background = background instanceof Background ? background : new Background(background)
  }

  /** Adds an item in front of the ones before it. Returns the scene, to chain. */
  add(item: Drawable | Art, { x = 0, y, ground, scale, fitHeight, flip = false, ink, paper }: Placement = {}): this {
    if (y !== undefined && ground !== undefined) throw new Error('give y or ground, not both')
    if (scale !== undefined && fitHeight !== undefined) throw new Error('give scale or fitHeight, not both')
    if (fitHeight !== undefined && !(fitHeight > 0)) throw new Error(`fitHeight must be positive, got ${fitHeight}`)
    const { height } = sizeOf(item)
    const k = fitHeight !== undefined ? fitHeight / height : scale ?? 1
    this.items.push({ item, at: { x, y: ground !== undefined ? ground - height * k : y ?? 0, scale: k, flip, ink, paper } })
    return this
  }

  get size() { return { width: this.width, height: this.height } }

  /** Background and items, for placing inside a bigger scene. */
  group(props: SVGProps<SVGGElement> = {}): ReactElement {
    return createElement('g', props, this.background.render({ x: 0, y: 0, width: this.width, height: this.height }),
      ...this.items.map(({ item, at }, i) => {
        const { width } = sizeOf(item)
        // Flipping mirrors about the item's own centre, so the box it covers stays where it was placed.
        const transform = `translate(${at.flip ? at.x + width * at.scale : at.x} ${at.y}) scale(${at.flip ? -at.scale : at.scale} ${at.scale})`
        return createElement('g', { key: i, transform, 'data-item': i },
          typeof item === 'function' ? createElement(item, { ink: at.ink, paper: at.paper }) : item.group())
      }))
  }

  /** A standalone SVG. */
  render(props: SVGProps<SVGSVGElement> = {}): ReactElement {
    return createElement('svg', { viewBox: `0 0 ${this.width} ${this.height}`, xmlns: 'http://www.w3.org/2000/svg', ...props }, this.group())
  }
}
