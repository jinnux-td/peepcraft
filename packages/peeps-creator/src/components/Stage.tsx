import { useEffect, useState } from 'react'
import type { Box } from '@kit/peeps'
import { load, Scene, type CreatorState } from '@kit/peeps-engine'

/** The figure on its background, in the window `box` (from the measured outlines of @kit/peeps-engine, one per type, figure and extra, so a
 *  tall hat never zooms the stage). A new picture shows whole, once its paths are in; until then the last one stays, or the parts fetched
 *  ahead (the thumbnails of the open tab) would show alone. A failed part does not hold it back: drawing it fetches it again. */
export function Stage({ state, box }: { state: CreatorState; box: Box }) {
  const [shown, setShown] = useState({ state, box })
  useEffect(() => {
    let on = true
    load(state).catch(() => {}).then(() => { if (on) setShown({ state, box }) })
    return () => { on = false }
  }, [state, box])
  const waiting = shown.state !== state
  return (
    <div className="pc-stage" data-transparent={shown.state.bg === 'transparent' || undefined} data-loading={waiting || undefined} aria-busy={waiting} data-testid="pc-stage">
      <Scene state={shown.state} box={shown.box} />
    </div>
  )
}
