import { useEffect, useRef } from 'react'
import { lookup as lookupFigure } from '@kit/transhumans'
import { SCENE } from '../scene.ts'
import type { CreatorState, SceneEntry } from '../types.ts'
import { icons } from './icons.tsx'
import { Slider } from './Slider.tsx'
import { LookThumb } from './Thumb.tsx'

const name = (e: SceneEntry) => (e.figure ? lookupFigure(e.figure).label : e.type)

/** The Scene tab: add the current peep or figure, pick a member, then move, size, flip, reorder or remove it. */
export function ScenePanel({ state, selected, onSelect, onAdd, onLive, onCommit, onRemove, onMove }: {
  state: CreatorState; selected: number | null; onSelect: (i: number | null) => void; onAdd: () => void
  /** Sliders: no undo step of their own. */
  onLive: (i: number, patch: Partial<Pick<SceneEntry, 'x' | 'size'>>) => void
  onCommit: (i: number, patch: Partial<Pick<SceneEntry, 'flip'>>) => void
  onRemove: (i: number) => void; onMove: (i: number, by: 1 | -1) => void
}) {
  const I = icons
  const e = selected !== null ? state.scene[selected] : undefined
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => { grid.current?.querySelector('[aria-checked=true]')?.scrollIntoView({ block: 'nearest' }) }, [selected])
  return (
    <>
      <h2><span>Scene<small>{state.scene.length ? `${state.scene.length} in the scene` : 'add peeps and figures'}</small></span></h2>
      <div className="pc-grid" role="radiogroup" aria-label="Scene" ref={grid}>
        <button className="pc-tile pc-add" onClick={onAdd} title="Add the current peep or figure to the scene">
          <LookThumb look={state} bg={state.bg} /><span><I.add /> Add</span>
        </button>
        {state.scene.map((m, i) => (
          <button key={i} role="radio" aria-checked={selected === i} className="pc-tile" onClick={() => onSelect(selected === i ? null : i)} title={`${i + 1}. ${name(m)}`}>
            <LookThumb look={m} bg={state.bg} /><span>{i + 1}. {name(m)}</span>
          </button>
        ))}
      </div>
      {e && selected !== null ? (
        <div className="pc-member" role="group" aria-label={`Member ${selected + 1}`}>
          <Slider label="Position" value={Math.round((e.x / SCENE) * 100)} min={0} max={100} step={1} unit="%" onChange={(v) => onLive(selected, { x: (v / 100) * SCENE })} />
          <Slider label="Size" value={e.size} min={0.3} max={1.5} step={0.05} onChange={(size) => onLive(selected, { size })} />
          <div className="pc-row">
            <button className="pc-btn" aria-label="Flip" aria-pressed={e.flip} onClick={() => onCommit(selected, { flip: !e.flip })}><I.flip /><span>Flip</span></button>
            <button className="pc-btn" aria-label="Back" onClick={() => onMove(selected, -1)} disabled={selected === 0}><I.back /><span>Back</span></button>
            <button className="pc-btn" aria-label="Front" onClick={() => onMove(selected, 1)} disabled={selected === state.scene.length - 1}><I.front /><span>Front</span></button>
            <button className="pc-btn" aria-label="Remove" onClick={() => onRemove(selected)}><I.remove /><span>Remove</span></button>
          </div>
        </div>
      ) : state.scene.length > 0 && <p className="pc-note">Pick a member, here or on the stage, to move it.</p>}
    </>
  )
}
