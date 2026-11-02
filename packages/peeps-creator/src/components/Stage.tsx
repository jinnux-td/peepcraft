import type { Box } from '@kit/peeps'
import { Scene, type CreatorState } from '@kit/peeps-engine'

/** The figure on its background, in the window `box` (from the measured outlines of @kit/peeps-engine, one per type, figure and extra, so a
 *  tall hat never zooms the stage). Parts and figures draw again by themselves once their paths are in. */
export function Stage({ state, box }: { state: CreatorState; box: Box }) {
  return (
    <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage">
      <Scene state={state} box={box} />
    </div>
  )
}
