import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Box } from '@kit/peeps'
import { lookup as lookupFigure } from '@kit/transhumans'
import { boxKey, Scene } from '../scene.ts'
import type { CreatorState } from '../types.ts'

/** The figure on its background. The window on the figure is measured once per type and then kept, so a tall hat never zooms the stage. */
export function Stage({ state, box, measured, onMeasure }: { state: CreatorState; box: Box; measured: boolean; onMeasure: (key: string, outline: Box) => void }) {
  const figure = useRef<SVGGElement | null>(null)
  const ref = useCallback((el: SVGGElement | null) => { figure.current = el }, [])
  // A figure's drawing loads on demand and measures as nothing until then: measure again once it is in.
  const [loaded, setLoaded] = useState<string | null>(null)
  useEffect(() => {
    let on = true; const id = state.figure
    if (id) lookupFigure(id).load().then(() => on && setLoaded(id), () => {})
    return () => { on = false }
  }, [state.figure])
  useLayoutEffect(() => {
    const el = figure.current
    if (!el || measured) return
    const b = el.getBBox()
    if (b.width > 0) onMeasure(boxKey(state), { x: b.x, y: b.y, width: b.width, height: b.height })
  }, [state.type, state.figure, state.extra?.id, measured, onMeasure, loaded])
  return (
    <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage">
      <Scene state={state} box={box} measure={ref} />
    </div>
  )
}
