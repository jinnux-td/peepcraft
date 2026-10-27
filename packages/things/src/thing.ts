// A thing is an object drawn in code (a chair, a plant, a cat) as a React component that draws a <g> in its own canvas. It has the same
// shape as a peeps atom or a transhumans figure (width, height, ink, paper), so a peeps Scene places it with no import between the packages.
import { createElement, type ReactElement, type SVGProps } from 'react'

export type Group = 'furniture' | 'home' | 'small' | 'pets'

export interface ThingProps extends Omit<SVGProps<SVGGElement>, 'ref'> {
  /** Line colour, and the dark fills. */
  ink?: string
  /** Fill inside the lines. */
  paper?: string
  /** Colours of the named parts (`slots`), such as `{ pot: '#c96' }`; a part left out takes `paper`. */
  colors?: Partial<Record<string, string>>
}

export interface ThingMeta {
  /** Kebab-case key ("floor-lamp"). */
  id: string
  label: string
  group: Group
  /** Canvas size in the peeps' hi-res units (a standing peep is about 3100 tall, so about 18 units per cm). The bottom edge is the floor. */
  width: number
  height: number
}

/** The meta, plus the named parts that can take their own colour, in drawing order. */
export type Thing = ((props: ThingProps) => ReactElement) & ThingMeta & { slots: readonly string[] }

/** One closed or open path, outlined in ink and filled with paper, ink, nothing, or a named part's colour (`'pot'`). */
export type Part = [d: string, fill?: 'paper' | 'ink' | 'none' | (string & {})]

const FIXED = ['paper', 'ink', 'none']

export const INK = '#000000'
export const PAPER = '#FFFFFF'
/** Line width; close to the strokes of the Open Peeps art at the same scale. */
export const LINE = 20

export function thing(meta: ThingMeta, parts: readonly Part[]): Thing {
  const Component = ({ ink = INK, paper = PAPER, colors = {}, ...rest }: ThingProps) =>
    createElement('g', { ...rest, stroke: ink, strokeWidth: LINE, strokeLinecap: 'round', strokeLinejoin: 'round' },
      ...parts.map(([d, fill = 'paper'], i) => createElement('path', { key: i, d, fill: fill === 'ink' ? ink : fill === 'none' ? 'none' : fill === 'paper' ? paper : colors[fill] ?? paper, 'data-part': FIXED.includes(fill) ? undefined : fill })))
  Component.displayName = `Thing.${meta.id}`
  const slots = [...new Set(parts.map(([, f = 'paper']) => f).filter((f) => !FIXED.includes(f)))]
  return Object.assign(Component, meta, { slots })
}

// Path helpers. Numbers are rounded so the generated markup stays short.
const n = (v: number) => Math.round(v * 10) / 10

/** A rectangle with round corners. */
export function rect(x: number, y: number, w: number, h: number, r = 0): string {
  r = Math.min(r, w / 2, h / 2)
  return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)}Z`
}

export const ellipse = (cx: number, cy: number, rx: number, ry = rx): string =>
  `M${n(cx - rx)} ${n(cy)}A${rx} ${ry} 0 1 0 ${n(cx + rx)} ${n(cy)}A${rx} ${ry} 0 1 0 ${n(cx - rx)} ${n(cy)}Z`

/** A straight polygon through the points. */
export const poly = (...pts: number[]): string => `M${pts.map(n).join(' ').replace(/^(\S+ \S+) /, '$1L')}Z`

/** A leaf from its base, `angle` in degrees (0 points right, -90 up), with its width as a share of its length. */
export function leaf(x: number, y: number, angle: number, length: number, width = 0.32): string {
  const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a)
  const tx = x + dx * length, ty = y + dy * length, mx = x + dx * length * 0.45, my = y + dy * length * 0.45
  const w = length * width
  return `M${n(x)} ${n(y)}Q${n(mx - dy * w)} ${n(my + dx * w)} ${n(tx)} ${n(ty)}Q${n(mx + dy * w)} ${n(my - dx * w)} ${n(x)} ${n(y)}Z`
}

/** The middle vein of a leaf made with the same arguments. */
export function vein(x: number, y: number, angle: number, length: number): string {
  const a = (angle * Math.PI) / 180
  return `M${n(x)} ${n(y)}L${n(x + Math.cos(a) * length * 0.8)} ${n(y + Math.sin(a) * length * 0.8)}`
}
