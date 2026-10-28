import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defaults, type PeepType, type Slot } from '@kit/peeps'
import { extras } from '@kit/things'
import { figures } from '@kit/transhumans'
import { tabColors, type ColorTarget } from '../colors.ts'
import { optionsFor, partId } from '../state.ts'
import type { CreatorState, Tab } from '../types.ts'
import { icons, type IconName } from './icons.tsx'
import { Lock } from './Lock.tsx'
import { Swatches } from './Swatches.tsx'
import { FigureThumb, LookThumb, Thumb, type Boxes } from './Thumb.tsx'

const types: PeepType[] = ['standing', 'sitting', 'bust']
export const tabs: ReadonlyArray<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'type', label: 'Type', icon: 'type' }, { id: 'body', label: 'Body', icon: 'body' }, { id: 'head', label: 'Hair', icon: 'head' },
  { id: 'face', label: 'Face', icon: 'face' }, { id: 'facialHair', label: 'Facial hair', icon: 'facialHair' }, { id: 'accessories', label: 'Accessories', icon: 'accessories' },
  { id: 'extra', label: 'Extra', icon: 'extra' },
  { id: 'figures', label: 'Figures', icon: 'figure' }, { id: 'scene', label: 'Scene', icon: 'scene' },
]

/** "crossed_arms-1" -> "Crossed arms 1": the pack's file names are not menu text. */
export const nice = (label: string) => { const t = label.replace(/[_-]+/g, ' ').trim(); return t[0].toUpperCase() + t.slice(1) }

/** Category tabs on the left, the options of the open tab as a grid, a dice that changes only this tab, and the colours of what the tab is
 *  about (the hair and the hat, the pieces of the outfit) as dots: one opens its swatches. The Scene tab shows `children`. */
export function PartPicker({ state, tab, onTab, boxes, colors, used, onChoose, onType, onFigure, onExtra, onDice, onLock, children }: {
  state: CreatorState; tab: Tab; onTab: (t: Tab) => void; boxes: Boxes; colors: ColorTarget[]; used: readonly string[]; onLock: (slot: Slot) => void
  onChoose: (slot: Slot, id: string) => void; onType: (t: PeepType) => void; onFigure: (id: string | null) => void; onExtra: (id: string | null) => void; onDice: (target: Exclude<Tab, 'scene'>) => void
  children?: ReactNode
}) {
  const slot = tab === 'type' || tab === 'figures' || tab === 'scene' || tab === 'extra' ? null : tab
  // Parts belong to the peep builder; while a figure is on the stage they have nothing to act on.
  const onFigureNow = state.figure !== null && tab !== 'figures'
  const label = tabs.find((t) => t.id === tab)!.label
  const options = slot ? optionsFor(state.type, slot) : []
  const None = icons.none
  const grid = useRef<HTMLDivElement>(null)
  const current = slot ? partId(state, slot) : tab === 'figures' ? state.figure ?? '' : tab === 'extra' ? state.extra?.id ?? '' : state.type
  // A tab opens at the top of its items; after a dice the new choice comes into view, scrolling the grid only (scrollIntoView would move the
  // page too, and a page that has just loaded stays at its top).
  const seen = useRef(tab)
  useEffect(() => {
    const g = grid.current, el = g?.querySelector<HTMLElement>('[aria-checked=true]')
    if (seen.current !== tab) { seen.current = tab; if (g) g.scrollTop = 0; return }
    if (!g || !el) return
    const top = el.offsetTop - g.offsetTop
    if (top < g.scrollTop) g.scrollTop = top
    else if (top + el.offsetHeight > g.scrollTop + g.clientHeight) g.scrollTop = top + el.offsetHeight - g.clientHeight
  }, [current, tab])
  // Thumbnails show each item by itself, or on the whole peep to see several parts together.
  const [onPeep, setOnPeep] = useState(false)
  // Items as a grid of pictures, or a list with each name in full.
  const [list, setList] = useState(false)
  const View = list ? icons.grid : icons.list
  const Dice = icons.dice
  const dots = tabColors(tab, colors)
  const [open, setOpen] = useState<string | null>(null)
  const picked = dots.find((d) => d.id === open)
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
          <span>{label}<small>{tab === 'figures' ? `${figures.length} whole figures` : tab === 'extra' ? `${extras.length} to choose from, worn by the peep` : slot ? `${options.length} to choose from` : 'the shape of the figure'}</small></span>
          {slot && <button className="pc-chip" aria-pressed={onPeep} onClick={() => setOnPeep(!onPeep)} title="Show each item on the whole peep">On peep</button>}
          <button className="pc-view" aria-pressed={list} aria-label="Show as a list" title={list ? 'Show as a grid' : 'Show as a list'} onClick={() => setList(!list)}><View /></button>
          {slot && <Lock what={label} locked={!!state.locked?.includes(slot)} onToggle={() => onLock(slot)} />}
          <button className="pc-dice" disabled={onFigureNow} onClick={() => onDice(tab as Exclude<Tab, 'scene'>)} aria-label={`Random ${label.toLowerCase()}`} title={`Random ${label.toLowerCase()}`}><Dice /></button>
        </h2>
        {!onFigureNow && dots.length > 0 && (
          <div className="pc-dots" role="radiogroup" aria-label="Colour of">
            {dots.map((d) => (
              <button key={d.id} role="radio" aria-checked={d.id === open} data-tip={`${d.label} ${d.value}`} className="pc-token" onClick={() => setOpen(d.id === open ? null : d.id)}>
                <i style={{ background: d.value }} data-changed={d.reset ? '' : undefined} /><span>{d.label}</span>
              </button>
            ))}
          </div>
        )}
        {!onFigureNow && picked && (
          <div className="pc-picked">
            <Swatches label={picked.label} value={picked.value} options={picked.options} used={used} onChange={picked.onChange} />
            {picked.reset && <button className="pc-link" onClick={picked.reset.run}>{picked.reset.label}</button>}
          </div>
        )}
        <div className={list ? 'pc-grid pc-list' : 'pc-grid'} role="radiogroup" aria-label={label} ref={grid}>
          {onFigureNow && (
            <div className="pc-note"><p>A whole figure is on the stage; parts belong to the peep builder.</p><button className="pc-btn" onClick={() => onFigure(null)}>Back to the peep builder</button></div>
          )}
          {tab === 'figures' && <>
            <button role="radio" aria-checked={state.figure === null} className="pc-tile" onClick={() => onFigure(null)} data-tip="Build a peep from parts"><span className="pc-none"><None /></span><span>Peep</span></button>
            {figures.map((f) => (
              <button key={f.id} role="radio" aria-checked={state.figure === f.id} className="pc-tile" onClick={() => onFigure(f.id)} data-tip={f.label}>
                <FigureThumb state={state} figure={f} /><span>{f.label}</span>
              </button>
            ))}
          </>}
          {!onFigureNow && tab === 'type' && types.map((t) => (
            <button key={t} role="radio" aria-checked={state.figure === null && state.type === t} className="pc-tile" onClick={() => onType(t)}>
              <Thumb state={{ ...state, type: t, parts: {} }} slot="body" id={defaults[t].body} boxes={boxes} /><span>{t}</span>
            </button>
          ))}
          {!onFigureNow && tab === 'extra' && <>
            <button role="radio" aria-checked={!state.extra} className="pc-tile" onClick={() => onExtra(null)} data-tip="None"><span className="pc-none"><None /></span><span>None</span></button>
            {extras.map((t) => (
              <button key={t.id} role="radio" aria-checked={state.extra?.id === t.id} className="pc-tile" onClick={() => onExtra(t.id)} data-tip={t.label}>
                {/* On the peep, in its colours: the picked ones for the extra worn, its own for the others. */}
                <LookThumb look={{ ...state, figure: null, extra: state.extra?.id === t.id ? state.extra : { id: t.id, ink: t.ink ?? state.ink, paper: t.paper ?? state.paper } }} bg={state.bg} /><span>{t.label}</span>
              </button>
            ))}
          </>}
          {!onFigureNow && slot && options.map((a) => { return (
            <button key={a.id} role="radio" aria-checked={current === a.id} className="pc-tile" onClick={() => onChoose(slot, a.id)} data-tip={a.id === 'none' ? 'None' : nice(a.label)}>
              {a.id === 'none' ? <span className="pc-none"><None /></span> : <Thumb state={state} slot={slot} id={a.id} boxes={boxes} alone={!onPeep} />}
              <span>{a.id === 'none' ? 'None' : nice(a.label)}</span>
            </button>
          ) })}
        </div>
        </>}
      </div>
    </section>
  )
}
