import { useEffect, useRef } from 'react'
import { things } from '@kit/things'
import { lookup as lookupFigure } from '@kit/transhumans'
import { LIFT, SCENE } from '../scene.ts'
import { ACCEPT } from '../uploads.ts'
import type { CreatorState, SceneEntry, Upload } from '../types.ts'
import { icons } from './icons.tsx'
import { Slider } from './Slider.tsx'
import { LookThumb } from './Thumb.tsx'

const name = (e: SceneEntry) => (e.upload ? e.upload.name : e.thing ? things.find((t) => t.id === e.thing)?.label ?? e.thing : e.figure ? lookupFigure(e.figure).label : e.type)

/** The left side of the Scene tab, what can be added: the current peep or figure, a thing, an upload. */
export function SceneSources({ state, onAdd, uploads, uploadNote, onUpload, onDeleteUpload }: {
  state: CreatorState
  /** Without arguments: the current peep or figure. */
  onAdd: (what?: Pick<SceneEntry, 'thing' | 'upload'>) => void
  uploads: Upload[]; uploadNote: string; onUpload: (files: File[]) => void; onDeleteUpload: (id: string) => void
}) {
  const I = icons
  return (
    <div className="pc-scene">
      <h2><span>Scene<small>add peeps, figures and things</small></span></h2>
      <div className="pc-grid pc-small">
        <button className="pc-tile pc-add" onClick={() => onAdd()} title="Add the current peep or figure to the scene">
          <LookThumb look={state} bg={state.bg} /><span><I.add /> Add</span>
        </button>
      </div>

      <h3>Things<small>in the current colours</small></h3>
      <div className="pc-grid pc-small pc-things" aria-label="Things">
        {things.map((t) => (
          <button key={t.id} className="pc-tile" onClick={() => onAdd({ thing: t.id })} aria-label={`Add ${t.label.toLowerCase()}`} title={`Add ${t.label.toLowerCase()}`}>
            <LookThumb look={{ ...state, figure: null, thing: t.id }} bg={state.bg} /><span>{t.label}</span>
          </button>
        ))}
      </div>

      <h3>Uploads<small>kept in this browser only</small></h3>
      <div className="pc-grid pc-small" aria-label="Uploads">
        <label className="pc-tile pc-add pc-file" title="PNG, JPEG, WebP, GIF or SVG, up to 5 MB">
          <span className="pc-none"><I.upload /></span><span>Upload</span>
          <input type="file" accept={ACCEPT.join(',')} multiple aria-label="Upload a picture" onChange={(ev) => { onUpload([...(ev.target.files ?? [])]); ev.target.value = '' }} />
        </label>
        {uploads.map((u) => (
          <div key={u.id} className="pc-upload">
            <button className="pc-tile" onClick={() => onAdd({ upload: u })} aria-label={`Add ${u.name}`} title={`Add ${u.name}`}>
              <LookThumb look={{ ...state, figure: null, upload: u }} bg={state.bg} /><span>{u.name}</span>
            </button>
            <button className="pc-x" onClick={() => onDeleteUpload(u.id)} aria-label={`Delete ${u.name}`} title="Delete from this browser"><I.close /></button>
          </div>
        ))}
      </div>
      {uploadNote && <p className="pc-note" role="status">{uploadNote}</p>}
    </div>
  )
}

/** The right side of the Scene tab: the members, back to front; pick one to move, size, lift, flip, reorder or remove it. */
export function SceneMembers({ state, selected, onSelect, onLive, onCommit, onRemove, onMove }: {
  state: CreatorState; selected: number | null; onSelect: (i: number | null) => void
  /** Sliders: no undo step of their own. */
  onLive: (i: number, patch: Partial<Pick<SceneEntry, 'x' | 'size' | 'lift'>>) => void
  onCommit: (i: number, patch: Partial<Pick<SceneEntry, 'flip'>>) => void
  onRemove: (i: number) => void; onMove: (i: number, by: 1 | -1) => void
}) {
  const I = icons
  const e = selected !== null ? state.scene[selected] : undefined
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => { grid.current?.querySelector('[aria-checked=true]')?.scrollIntoView({ block: 'nearest' }) }, [selected])
  return (
    <>
      <h2><span>In the scene<small>{state.scene.length ? `${state.scene.length}, back to front` : 'nothing yet'}</small></span></h2>
      {state.scene.length > 0 && (
        <div className="pc-grid pc-members" role="radiogroup" aria-label="Scene" ref={grid}>
          {state.scene.map((m, i) => (
            <button key={i} role="radio" aria-checked={selected === i} className="pc-tile" onClick={() => onSelect(selected === i ? null : i)} title={`${i + 1}. ${name(m)}`}>
              <LookThumb look={m} bg={state.bg} /><span>{i + 1}. {name(m)}</span>
            </button>
          ))}
        </div>
      )}
      {e && selected !== null ? (
        <div className="pc-member" role="group" aria-label={`Member ${selected + 1}`}>
          <Slider label="Position" value={Math.round((e.x / SCENE) * 100)} min={0} max={100} step={1} unit="%" onChange={(v) => onLive(selected, { x: (v / 100) * SCENE })} />
          <Slider label="Size" value={e.size} min={0.2} max={2} step={0.05} onChange={(size) => onLive(selected, { size })} />
          <Slider label="Lift" value={Math.round(((e.lift ?? 0) / SCENE) * 100)} min={LIFT.min * 100} max={LIFT.max * 100} step={1} unit="%" onChange={(v) => onLive(selected, { lift: (v / 100) * SCENE })} />
          <div className="pc-row">
            <button className="pc-btn" aria-label="Flip" title="Flip" aria-pressed={e.flip} onClick={() => onCommit(selected, { flip: !e.flip })}><I.flip /><span>Flip</span></button>
            <button className="pc-btn" aria-label="Back" title="Back" onClick={() => onMove(selected, -1)} disabled={selected === 0}><I.back /><span>Back</span></button>
            <button className="pc-btn" aria-label="Front" title="Front" onClick={() => onMove(selected, 1)} disabled={selected === state.scene.length - 1}><I.front /><span>Front</span></button>
            <button className="pc-btn" aria-label="Remove" title="Remove" onClick={() => onRemove(selected)}><I.remove /><span>Remove</span></button>
          </div>
        </div>
      ) : state.scene.length > 0 && <p className="pc-note">Pick one here, or drag it on the stage.</p>}
    </>
  )
}
