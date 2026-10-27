import { useEffect, useRef, type ReactNode } from 'react'
import { defaults, type PeepType, type Slot } from '@kit/peeps'
import { figures } from '@kit/transhumans'
import { optionsFor, partId } from '../state.ts'
import type { CreatorState, Tab } from '../types.ts'
import { icons, type IconName } from './icons.tsx'
import { FigureThumb, Thumb, type Boxes } from './Thumb.tsx'

const types: PeepType[] = ['standing', 'sitting', 'bust']
export const tabs: ReadonlyArray<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'type', label: 'Type', icon: 'type' }, { id: 'body', label: 'Body', icon: 'body' }, { id: 'head', label: 'Hair', icon: 'head' },
  { id: 'face', label: 'Face', icon: 'face' }, { id: 'facialHair', label: 'Facial hair', icon: 'facialHair' }, { id: 'accessories', label: 'Accessories', icon: 'accessories' },
  { id: 'figures', label: 'Figures', icon: 'figure' }, { id: 'scene', label: 'Scene', icon: 'scene' },
]

/** "crossed_arms-1" -> "Crossed arms 1": the pack's file names are not menu text. */
export const nice = (label: string) => { const t = label.replace(/[_-]+/g, ' ').trim(); return t[0].toUpperCase() + t.slice(1) }

/** Category tabs on the left, the options of the open tab as a grid, and a dice that changes only this tab. The Scene tab shows `children`. */
export function PartPicker({ state, tab, onTab, boxes, onChoose, onType, onFigure, onDice, children }: {
  state: CreatorState; tab: Tab; onTab: (t: Tab) => void; boxes: Boxes
  onChoose: (slot: Slot, id: string) => void; onType: (t: PeepType) => void; onFigure: (id: string | null) => void; onDice: (target: Exclude<Tab, 'scene'>) => void
  children?: ReactNode
}) {
  const slot = tab === 'type' || tab === 'figures' || tab === 'scene' ? null : tab
  // Parts belong to the peep builder; while a figure is on the stage they have nothing to act on.
  const onFigureNow = state.figure !== null && tab !== 'figures'
  const label = tabs.find((t) => t.id === tab)!.label
  const options = slot ? optionsFor(state.type, slot) : []
  const None = icons.none
  const grid = useRef<HTMLDivElement>(null)
  const current = slot ? partId(state, slot) : tab === 'figures' ? state.figure ?? '' : state.type
  // After a dice, bring the new choice into view.
  useEffect(() => { grid.current?.querySelector('[aria-checked=true]')?.scrollIntoView({ block: 'nearest' }) }, [current, tab])
  const Dice = icons.dice
  return (
    <section className="pc-panel pc-picker" aria-label="Parts">
      <div className="pc-rail" role="tablist" aria-label="Category" aria-orientation="vertical">
        {tabs.map((t) => { const I = icons[t.icon]; return (
          <button key={t.id} role="tab" id={`pc-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="pc-options" className="pc-rail-btn" onClick={() => onTab(t.id)} title={t.label}>
            <I /><span>{t.label}</span>
          </button>
        ) })}
      </div>
      <div className="pc-options" id="pc-options" role="tabpanel" aria-labelledby={`pc-tab-${tab}`}>
        {tab === 'scene' ? children : <>
        <h2>
          <span>{label}<small>{tab === 'figures' ? `${figures.length} whole figures` : slot ? `${options.length} to choose from` : 'the shape of the figure'}</small></span>
          <button className="pc-dice" disabled={onFigureNow} onClick={() => onDice(tab as Exclude<Tab, 'scene'>)} aria-label={`Random ${label.toLowerCase()}`} title={`Random ${label.toLowerCase()}`}><Dice /></button>
        </h2>
        <div className="pc-grid" role="radiogroup" aria-label={label} ref={grid}>
          {onFigureNow && (
            <div className="pc-note"><p>A whole figure is on the stage; parts belong to the peep builder.</p><button className="pc-btn" onClick={() => onFigure(null)}>Back to the peep builder</button></div>
          )}
          {tab === 'figures' && <>
            <button role="radio" aria-checked={state.figure === null} className="pc-tile" onClick={() => onFigure(null)} title="Build a peep from parts"><span className="pc-none"><None /></span><span>Peep</span></button>
            {figures.map((f) => (
              <button key={f.id} role="radio" aria-checked={state.figure === f.id} className="pc-tile" onClick={() => onFigure(f.id)} title={f.label}>
                <FigureThumb state={state} figure={f} /><span>{f.label}</span>
              </button>
            ))}
          </>}
          {!onFigureNow && tab === 'type' && types.map((t) => (
            <button key={t} role="radio" aria-checked={state.figure === null && state.type === t} className="pc-tile" onClick={() => onType(t)}>
              <Thumb state={{ ...state, type: t, parts: {} }} slot="body" id={defaults[t].body} boxes={boxes} /><span>{t}</span>
            </button>
          ))}
          {!onFigureNow && slot && options.map((a) => { return (
            <button key={a.id} role="radio" aria-checked={current === a.id} className="pc-tile" onClick={() => onChoose(slot, a.id)} title={nice(a.label)}>
              {a.id === 'none' ? <span className="pc-none"><None /></span> : <Thumb state={state} slot={slot} id={a.id} boxes={boxes} />}
              <span>{a.id === 'none' ? 'None' : nice(a.label)}</span>
            </button>
          ) })}
        </div>
        </>}
      </div>
    </section>
  )
}
