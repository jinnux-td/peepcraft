import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Box } from '@kit/peeps'
import { lookup as lookupFigure } from '@kit/transhumans'
import { boxKey, peepOf, Scene, type CreatorState } from '@kit/peeps-engine'

/** The figure on its background. The window on the figure is measured once per type and then kept, so a tall hat never zooms the stage. */
export function Stage({ state, box, measured, onMeasure }: { state: CreatorState; box: Box; measured: boolean; onMeasure: (key: string, outline: Box) => void }) {
  const figure = useRef<SVGGElement | null>(null)
  const ref = useCallback((el: SVGGElement | null) => { figure.current = el }, [])
  // A figure's drawing and a peep's parts load on demand and measure as nothing (or as a peep without its head) until they are in:
  // measure only once everything on the stage has loaded.
  const drawing = state.figure ? `figure:${state.figure}` : `${state.type}:${JSON.stringify(state.parts)}`
  const [loaded, setLoaded] = useState<string | null>(null)
  useEffect(() => {
    let on = true
    const ready = state.figure ? lookupFigure(state.figure).load() : peepOf(state).load()
    ready.then(() => on && setLoaded(drawing), () => {})
    return () => { on = false }
  }, [drawing])
  useLayoutEffect(() => {
    const el = figure.current
    if (!el || measured || loaded !== drawing) return
    const b = el.getBBox()
    if (b.width > 0) onMeasure(boxKey(state), { x: b.x, y: b.y, width: b.width, height: b.height })
  }, [state.type, state.figure, state.extra?.id, measured, onMeasure, loaded, drawing])
  return (
    <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage">
      <Scene state={state} box={box} measure={ref} />
    </div>
  )
}
