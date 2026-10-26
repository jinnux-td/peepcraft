import { useCallback, useLayoutEffect, useRef } from 'react'
import type { Box, PeepType } from '@kit/peeps'
import { Scene } from '../scene.ts'
import type { CreatorState } from '../types.ts'

/** The figure on its background. The window on the figure is measured once per type and then kept, so a tall hat never zooms the stage. */
export function Stage({ state, box, measured, onMeasure }: { state: CreatorState; box: Box; measured: boolean; onMeasure: (type: PeepType, outline: Box) => void }) {
  const figure = useRef<SVGGElement | null>(null)
  const ref = useCallback((el: SVGGElement | null) => { figure.current = el }, [])
  useLayoutEffect(() => {
    const el = figure.current
    if (!el || measured) return
    const b = el.getBBox()
    if (b.width > 0) onMeasure(state.type, { x: b.x, y: b.y, width: b.width, height: b.height })
  }, [state.type, measured, onMeasure])
  return (
    <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage">
      <Scene state={state} box={box} measure={ref} />
    </div>
  )
}
