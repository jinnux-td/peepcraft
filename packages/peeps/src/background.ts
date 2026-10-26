// What is drawn behind a figure or a whole scene: one colour, or nothing (transparent), so an export keeps its alpha.
import { createElement, type ReactElement } from 'react'

export const TRANSPARENT = 'transparent'

export interface Box { x: number; y: number; width: number; height: number }

export class Background {
  readonly color: string

  constructor(color: string = TRANSPARENT) { this.color = color.trim() || TRANSPARENT }

  get transparent(): boolean { return this.color.toLowerCase() === TRANSPARENT }

  /** A rectangle over `box`, or null when transparent. */
  render(box: Box): ReactElement | null {
    if (this.transparent) return null
    return createElement('rect', { x: box.x, y: box.y, width: box.width, height: box.height, fill: this.color, 'data-layer': 'background' })
  }
}
