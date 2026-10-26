import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Box, PeepType, Slot } from '@kit/peeps'
import { exportSvg, svgToPng } from '../export.ts'
import { randomize, type Target } from '../random.ts'
import { fallbackBox, squareAround } from '../scene.ts'
import { choose, commit, redo, setType, startHistory, tweak, undo, type History } from '../state.ts'
import { creatorCss } from '../styles.ts'
import { initialState, swatches, type CreatorState, type Tab, type ThemeId } from '../types.ts'
import { icons } from './icons.tsx'
import { PartPicker } from './PartPicker.tsx'
import { Slider } from './Slider.tsx'
import { Stage } from './Stage.tsx'
import { Swatches } from './Swatches.tsx'
import { ThemeMenu } from './ThemeMenu.tsx'
import type { Boxes } from './Thumb.tsx'

export interface ExportedFile { kind: 'svg' | 'png'; name: string; blob: Blob }

export interface PeepCreatorProps {
  /** Where to start; anything left out is the default. The component keeps the state; read it back with onChange. */
  defaultState?: Partial<CreatorState>
  onChange?: (state: CreatorState) => void
  /** Called with the file when Save is pressed. Without it the browser downloads the file. */
  onExport?: (file: ExportedFile) => void
  /** Controlled theme, or `defaultTheme` to let the component keep it. */
  theme?: ThemeId
  defaultTheme?: ThemeId
  onThemeChange?: (theme: ThemeId) => void
  /** The button that lets the person change theme. On by default. */
  showThemeButton?: boolean
  /** The heading; false for none. */
  title?: string | false
  className?: string
  style?: CSSProperties
}

function download(file: ExportedFile) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file.blob); a.download = file.name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** The whole creator. It lays itself out by its own width (container queries), so it fits a page or a dashboard panel alike. */
export function PeepCreator({ defaultState, onChange, onExport = download, theme: themeProp, defaultTheme = 'sunny', onThemeChange, showThemeButton = true, title = 'Peeps', className = '', style }: PeepCreatorProps) {
  const [hist, setHist] = useState<History>(() => startHistory({ ...initialState, ...defaultState }))
  const [tab, setTab] = useState<Tab>('head')
  const [boxes, setBoxes] = useState<Boxes>({})
  const [innerTheme, setInnerTheme] = useState<ThemeId>(defaultTheme)
  const theme = themeProp ?? innerTheme
  const state = hist.now

  const emitted = useRef(state)
  useEffect(() => { if (emitted.current !== state) { emitted.current = state; onChange?.(state) } }, [state, onChange])

  const record = (fn: (s: CreatorState) => CreatorState) => setHist((h) => commit(h, fn(h.now)))
  const live = (patch: Partial<CreatorState>) => setHist((h) => tweak(h, { ...h.now, ...patch }))
  const dice = (target: Target) => record((s) => randomize(s, target))
  const onMeasure = useCallback((type: PeepType, outline: Box) => setBoxes((b) => ({ ...b, [type]: outline })), [])
  const box = boxes[state.type] ? squareAround(boxes[state.type]!) : fallbackBox(state.type)
  const pickTheme = (t: ThemeId) => { setInnerTheme(t); onThemeChange?.(t) }

  const save = async (kind: 'svg' | 'png') => {
    const svg = exportSvg(state, box)
    onExport({ kind, name: `peep.${kind}`, blob: kind === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg) })
  }

  const types: PeepType[] = ['standing', 'sitting', 'bust']
  const I = icons
  const isStart = JSON.stringify(state) === JSON.stringify({ ...initialState, ...defaultState })
  const reset = () => record(() => ({ ...initialState, ...defaultState }))

  return (
    <div
      className={`pc ${className}`.trim()} style={style} data-pc-theme={theme}
      onKeyDown={(e) => { if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !(e.target as HTMLElement).closest('input, select, textarea')) live({ flip: !state.flip }) }}
    >
      <style>{creatorCss}</style>
      <header className="pc-head">
        {title !== false && <h1 className="pc-title">{title}<small>character creator</small></h1>}
        <div className="pc-toolbar" role="toolbar" aria-label="Actions">
          <button className="pc-btn" onClick={() => dice('all')}><I.shuffle /><span>Shuffle all</span></button>
          <button className="pc-btn" onClick={() => setHist(undo)} disabled={!hist.past.length}><I.undo /><span>Undo</span></button>
          <button className="pc-btn" onClick={() => setHist(redo)} disabled={!hist.future.length}><I.redo /><span>Redo</span></button>
          <button className="pc-btn" onClick={reset} disabled={isStart}><I.reset /><span>Reset</span></button>
          {showThemeButton && <ThemeMenu theme={theme} onChange={pickTheme} />}
        </div>
      </header>

      <div className="pc-main">
        <PartPicker
          state={state} tab={tab} onTab={setTab} boxes={boxes}
          onChoose={(slot: Slot, id) => record((s) => choose(s, slot, id))} onType={(t) => record((s) => setType(s, t))} onDice={(t) => dice(t)}
        />

        <section className="pc-stage-wrap" aria-label="Preview">
          <Stage state={state} box={box} measured={!!boxes[state.type]} onMeasure={onMeasure} />
          <div className="pc-pill" role="group" aria-label="Type">
            {types.map((t) => <button key={t} aria-pressed={state.type === t} onClick={() => record((s) => setType(s, t))}>{t}</button>)}
          </div>
          <p className="pc-hint">Press <kbd>F</kbd> to flip. Parts left alone use the defaults of the type.</p>
        </section>

        <section className="pc-panel pc-side" aria-label="Look">
          <Swatches label="Background" value={state.bg} options={swatches.bg} transparent onChange={(bg) => live({ bg })} />
          <Swatches label="Foreground" value={state.ink} options={swatches.ink} onChange={(ink) => live({ ink })} />
          <Swatches label="Paper" value={state.paper} options={swatches.paper} onChange={(paper) => live({ paper })} />
          <Slider label="Scale" value={state.scale} min={0.5} max={1.5} step={0.05} onChange={(scale) => live({ scale })} />
          <Slider label="Rotate" value={state.rotate} min={-180} max={180} step={5} unit="°" onChange={(rotate) => live({ rotate })} />
          <button className="pc-btn pc-wide" aria-pressed={state.flip} onClick={() => live({ flip: !state.flip })}><I.flip /><span>Flip</span></button>
          <div className="pc-save">
            <button className="pc-btn pc-primary" onClick={() => save('svg')}><I.download /><span>Save as SVG</span></button>
            <button className="pc-btn pc-primary" onClick={() => save('png')}><I.download /><span>Save as PNG</span></button>
          </div>
        </section>
      </div>
    </div>
  )
}
