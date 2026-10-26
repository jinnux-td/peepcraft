import { useEffect, useRef } from 'react'
import { defaults, type PeepType, type Slot } from '@kit/peeps'
import { optionsFor, partId } from '../state.ts'
import type { CreatorState, Tab } from '../types.ts'
import { icons, type IconName } from './icons.tsx'
import { Thumb, type Boxes } from './Thumb.tsx'

const types: PeepType[] = ['standing', 'sitting', 'bust']
export const tabs: ReadonlyArray<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'type', label: 'Type', icon: 'type' }, { id: 'body', label: 'Body', icon: 'body' }, { id: 'head', label: 'Hair', icon: 'head' },
  { id: 'face', label: 'Face', icon: 'face' }, { id: 'facialHair', label: 'Facial hair', icon: 'facialHair' }, { id: 'accessories', label: 'Accessories', icon: 'accessories' },
]

/** "crossed_arms-1" -> "Crossed arms 1": the pack's file names are not menu text. */
export const nice = (label: string) => { const t = label.replace(/[_-]+/g, ' ').trim(); return t[0].toUpperCase() + t.slice(1) }

/** Category tabs on the left, the options of the open tab as a grid, and a dice that changes only this tab. */
export function PartPicker({ state, tab, onTab, boxes, onChoose, onType, onDice }: {
  state: CreatorState; tab: Tab; onTab: (t: Tab) => void; boxes: Boxes
  onChoose: (slot: Slot, id: string) => void; onType: (t: PeepType) => void; onDice: (target: Tab) => void
}) {
  const slot = tab === 'type' ? null : tab
  const label = tabs.find((t) => t.id === tab)!.label
  const options = slot ? optionsFor(state.type, slot) : []
  const grid = useRef<HTMLDivElement>(null)
  const current = slot ? partId(state, slot) : state.type
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
        <h2>
          <span>{label}<small>{slot ? `${options.length} to choose from` : 'the shape of the figure'}</small></span>
          <button className="pc-dice" onClick={() => onDice(tab)} aria-label={`Random ${label.toLowerCase()}`} title={`Random ${label.toLowerCase()}`}><Dice /></button>
        </h2>
        <div className="pc-grid" role="radiogroup" aria-label={label} ref={grid}>
          {slot === null && types.map((t) => (
            <button key={t} role="radio" aria-checked={state.type === t} className="pc-tile" onClick={() => onType(t)}>
              <Thumb state={{ ...state, type: t, parts: {} }} slot="body" id={defaults[t].body} boxes={boxes} /><span>{t}</span>
            </button>
          ))}
          {slot && options.map((a) => { const None = icons.none; return (
            <button key={a.id} role="radio" aria-checked={current === a.id} className="pc-tile" onClick={() => onChoose(slot, a.id)} title={nice(a.label)}>
              {a.id === 'none' ? <span className="pc-none"><None /></span> : <Thumb state={state} slot={slot} id={a.id} boxes={boxes} />}
              <span>{a.id === 'none' ? 'None' : nice(a.label)}</span>
            </button>
          ) })}
        </div>
      </div>
    </section>
  )
}
