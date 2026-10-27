import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Box, PeepType, Slot } from '@kit/peeps'
import { exportSceneSvg, exportSvg, svgToPng } from '../export.ts'
import { randomize, type Target } from '../random.ts'
import { boxKey, fallbackBox, SceneView, squareAround } from '../scene.ts'
import { addToScene, choose, chooseFigure, commit, moveEntry, redo, removeEntry, showPeep, startHistory, tweak, undo, updateEntry, type History } from '../state.ts'
import { creatorCss } from '../styles.ts'
import { initialState, swatches, type CreatorState, type Tab, type ThemeId } from '../types.ts'
import { icons } from './icons.tsx'
import { PartPicker } from './PartPicker.tsx'
import { ScenePanel } from './ScenePanel.tsx'
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
  const [picked, setPicked] = useState<number | null>(null)
  const theme = themeProp ?? innerTheme
  const state = hist.now
  const inScene = tab === 'scene'
  // Undo can take the picked member away.
  const selected = picked !== null && picked < state.scene.length ? picked : null

  const emitted = useRef(state)
  useEffect(() => { if (emitted.current !== state) { emitted.current = state; onChange?.(state) } }, [state, onChange])

  const record = (fn: (s: CreatorState) => CreatorState) => setHist((h) => commit(h, fn(h.now)))
  const live = (patch: Partial<CreatorState>) => setHist((h) => tweak(h, { ...h.now, ...patch }))
  const dice = (target: Target) => record((s) => randomize(s, target))
  const onMeasure = useCallback((key: string, outline: Box) => setBoxes((b) => ({ ...b, [key]: outline })), [])
  const key = boxKey(state)
  const box = boxes[key] ? squareAround(boxes[key]!) : fallbackBox(state)
  const pickTheme = (t: ThemeId) => { setInnerTheme(t); onThemeChange?.(t) }

  const save = async (kind: 'svg' | 'png') => {
    const svg = inScene ? exportSceneSvg(state) : exportSvg(state, box)
    onExport({ kind, name: `${inScene ? 'scene' : 'peep'}.${kind}`, blob: kind === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg) })
  }

  const types: PeepType[] = ['standing', 'sitting', 'bust']
  const I = icons
  const isStart = JSON.stringify(state) === JSON.stringify({ ...initialState, ...defaultState })
  const reset = () => record(() => ({ ...initialState, ...defaultState }))
  const flipKey = () => (inScene ? selected !== null && record((s) => updateEntry(s, selected, { flip: !s.scene[selected].flip })) : live({ flip: !state.flip }))
  const pickOnStage = (target: EventTarget) => { const i = (target as Element).closest('[data-item]')?.getAttribute('data-item'); setPicked(i == null ? null : Number(i)) }

  return (
    <div
      className={`pc ${className}`.trim()} style={style} data-pc-theme={theme}
      onKeyDown={(e) => { if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !(e.target as HTMLElement).closest('input, select, textarea')) flipKey() }}
    >
      <style>{creatorCss}</style>
      <header className="pc-head">
        {title !== false && <h1 className="pc-title">{title}<small>character creator</small></h1>}
        <div className="pc-toolbar" role="toolbar" aria-label="Actions">
          <button className="pc-btn" onClick={() => dice('all')} disabled={inScene}><I.shuffle /><span>Shuffle all</span></button>
          <button className="pc-btn" onClick={() => setHist(undo)} disabled={!hist.past.length}><I.undo /><span>Undo</span></button>
          <button className="pc-btn" onClick={() => setHist(redo)} disabled={!hist.future.length}><I.redo /><span>Redo</span></button>
          <button className="pc-btn" onClick={reset} disabled={isStart}><I.reset /><span>Reset</span></button>
          {showThemeButton && <ThemeMenu theme={theme} onChange={pickTheme} />}
        </div>
      </header>

      <div className="pc-main">
        <PartPicker
          state={state} tab={tab} onTab={setTab} boxes={boxes}
          onChoose={(slot: Slot, id) => record((s) => choose(s, slot, id))} onType={(t) => record((s) => showPeep(s, t))} onFigure={(id) => record((s) => chooseFigure(s, id))} onDice={(t) => dice(t)}
        >
          <ScenePanel
            state={state} selected={selected} onSelect={setPicked}
            onAdd={() => { setPicked(state.scene.length); record((s) => addToScene(s, boxes[boxKey(s)])) }}
            onLive={(i, patch) => setHist((h) => tweak(h, updateEntry(h.now, i, patch)))}
            onCommit={(i, patch) => record((s) => updateEntry(s, i, patch))}
            onRemove={(i) => { setPicked(null); record((s) => removeEntry(s, i)) }}
            onMove={(i, by) => { setPicked(i + by); record((s) => moveEntry(s, i, by)) }}
          />
        </PartPicker>

        <section className="pc-stage-wrap" aria-label="Preview">
          {inScene ? <>
            <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage" data-view="scene" tabIndex={-1} onClick={(e) => pickOnStage(e.target)}>
              <SceneView state={state} selected={selected} />
            </div>
            <p className="pc-hint">{state.scene.length ? <>Click someone to pick them. Press <kbd>F</kbd> to flip them.</> : 'Build a peep or pick a figure, then press "Add".'}</p>
          </> : <>
          <Stage state={state} box={box} measured={!!boxes[key]} onMeasure={onMeasure} />
          <div className="pc-pill" role="group" aria-label="Type">
            {types.map((t) => <button key={t} aria-pressed={state.figure === null && state.type === t} onClick={() => record((s) => showPeep(s, t))}>{t}</button>)}
          </div>
          <p className="pc-hint">Press <kbd>F</kbd> to flip.{state.figure === null && ' Parts left alone use the defaults of the type.'}</p>
          </>}
        </section>

        <section className="pc-panel pc-side" aria-label="Look">
          <Swatches label="Background" value={state.bg} options={swatches.bg} transparent onChange={(bg) => live({ bg })} />
          {/* These edit the peep or figure being built; in the scene each member keeps the look it was added with. */}
          {!inScene && <>
          <Swatches label="Foreground" value={state.ink} options={swatches.ink} onChange={(ink) => live({ ink })} />
          <Swatches label="Paper" value={state.paper} options={swatches.paper} onChange={(paper) => live({ paper })} />
          <Slider label="Scale" value={state.scale} min={0.5} max={1.5} step={0.05} onChange={(scale) => live({ scale })} />
          <Slider label="Rotate" value={state.rotate} min={-180} max={180} step={5} unit="°" onChange={(rotate) => live({ rotate })} />
          <button className="pc-btn pc-wide" aria-pressed={state.flip} onClick={() => live({ flip: !state.flip })}><I.flip /><span>Flip</span></button>
          </>}
          <div className="pc-save">
            <button className="pc-btn pc-primary" onClick={() => save('svg')}><I.download /><span>Save as SVG</span></button>
            <button className="pc-btn pc-primary" onClick={() => save('png')}><I.download /><span>Save as PNG</span></button>
          </div>
        </section>
      </div>
    </div>
  )
}
