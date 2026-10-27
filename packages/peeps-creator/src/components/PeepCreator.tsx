import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Box, PeepType, Slot } from '@kit/peeps'
import { exportSceneSvg, exportSvg, svgToPng } from '../export.ts'
import { randomize, type Target } from '../random.ts'
import { boxKey, fallbackBox, frameBox, frameSize, SceneView, SIZE, squareAround } from '../scene.ts'
import { addToScene, choose, chooseFigure, commit, toggleLock, designColors, dragEntry, dropUpload, resizeEntry, setRatio, moveEntry, redo, removeEntry, showPeep, startHistory, tweak, undo, updateEntry, type History } from '../state.ts'
import { creatorCss } from '../styles.ts'
import { initialState, RATIOS, swatches, type CreatorState, type Ratio, type Tab, type ThemeId, type Upload } from '../types.ts'
import { deleteUpload, loadUploads, readUpload, saveUpload } from '../uploads.ts'
import { icons } from './icons.tsx'
import { Lock } from './Lock.tsx'
import { PartPicker } from './PartPicker.tsx'
import { SceneMembers, SceneSources } from './ScenePanel.tsx'
import { peepTargets } from '../colors.ts'
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
  const openTab = setTab
  /** A click on the peep on the stage opens the tab of the part under the pointer; on a figure, the Figures tab. */
  const pickPart = (target: EventTarget) => {
    const el = (target as Element).closest('[data-slot], [data-figure]')
    const slot = el?.getAttribute('data-slot')
    if (slot) openTab(slot as Tab)
    else if (el) openTab('figures')
  }
  const [boxes, setBoxes] = useState<Boxes>({})
  const [innerTheme, setInnerTheme] = useState<ThemeId>(defaultTheme)
  const [picked, setPicked] = useState<number | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploadNote, setUploadNote] = useState('')
  /** PNG size, times the 1024 px picture; a preference, not part of the picture, so not in the undo history. */
  const [pngScale, setPngScale] = useState(1)
  // No saved uploads when the browser keeps no storage (a private window): the library just starts empty.
  useEffect(() => { loadUploads().then(setUploads, () => {}) }, [])
  const theme = themeProp ?? innerTheme
  const state = hist.now
  const inScene = tab === 'scene'
  const used = designColors(state)
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

  const base = inScene ? frameSize(state) : { width: SIZE, height: SIZE }
  const px = { width: base.width * pngScale, height: base.height * pngScale }
  const save = async (kind: 'svg' | 'png') => {
    const svg = inScene ? exportSceneSvg(state) : exportSvg(state, box)
    onExport({ kind, name: `${inScene ? 'scene' : 'peep'}.${kind}`, blob: kind === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg, px.width, px.height) })
  }

  const types: PeepType[] = ['standing', 'sitting', 'bust']
  const I = icons
  const isStart = JSON.stringify(state) === JSON.stringify({ ...initialState, ...defaultState })
  const reset = () => record(() => ({ ...initialState, ...defaultState }))
  const flipKey = () => (inScene ? selected !== null && record((s) => updateEntry(s, selected, { flip: !s.scene[selected].flip })) : live({ flip: !state.flip }))
  const upload = async (files: File[]) => {
    setUploadNote('')
    for (const file of files) {
      let u: Upload
      try { u = await readUpload(file) } catch (err) { setUploadNote((err as Error).message); continue }
      setUploads((list) => [...list, u])
      try { await saveUpload(u) } catch { setUploadNote(`"${u.name}" could not be saved in this browser; it lasts until the page is closed.`) }
    }
  }
  const removeUpload = (id: string) => {
    setUploads((list) => list.filter((u) => u.id !== id))
    if (state.scene.some((e) => e.upload?.id === id)) { setPicked(null); record((s) => dropUpload(s, id)) }
    deleteUpload(id).catch(() => {})
  }
  // Dragging a member on the stage: one undo step per drag, taken on the first move, so a click that only picks adds none.
  // In the scene the side panel ends at the bottom of the window, wherever the host page puts the creator (sticky alone only helps once scrolled).
  const side = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = side.current
    if (!inScene || !el) return
    // Room left below the panel's top, less the creator's own bottom padding, so the creator's edge stays in view too.
    const pad = parseFloat(getComputedStyle(el.closest('.pc')!).paddingBottom) || 0
    const fit = () => el.style.setProperty('--pc-side-max', `${Math.max(240, innerHeight - Math.max(el.getBoundingClientRect().top, 12) - 12 - pad)}px`)
    fit()
    addEventListener('scroll', fit, { passive: true }); addEventListener('resize', fit)
    return () => { removeEventListener('scroll', fit); removeEventListener('resize', fit) }
  }, [inScene])
  // Grabbing the handle of the picked member resizes it; grabbing a member moves it.
  const drag = useRef<{ i: number; x: number; lift: number; size: number; resize: boolean; px: number; py: number; unit: number; moved: boolean } | null>(null)
  const grab = (ev: PointerEvent<HTMLDivElement>) => {
    const target = ev.target as Element, handle = target.closest('[data-handle]')
    const hit = handle?.getAttribute('data-handle') ?? target.closest('[data-item]')?.getAttribute('data-item')
    if (hit == null) { setPicked(null); return }
    const i = Number(hit), e = state.scene[i]
    setPicked(i)
    ev.currentTarget.setPointerCapture(ev.pointerId)
    drag.current = { i, x: e.x, lift: e.lift ?? 0, size: e.size, resize: !!handle, px: ev.clientX, py: ev.clientY, unit: frameBox(state).width / ev.currentTarget.getBoundingClientRect().width, moved: false }
  }
  const pull = (ev: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = (ev.clientX - d.px) * d.unit, dy = (ev.clientY - d.py) * d.unit
    if (!d.moved && Math.hypot(ev.clientX - d.px, ev.clientY - d.py) < 3) return
    const first = !d.moved
    d.moved = true
    setHist((h) => (first ? commit : tweak)(h, (d.resize ? resizeEntry : dragEntry)(h.now, d.i, d, dx, dy)))
  }

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
          state={state} tab={tab} onTab={openTab} boxes={boxes} colors={peepTargets(state, live, !!state.figure || !!state.mono)} used={used} onLock={(slot) => live(toggleLock(state, slot))}
          onChoose={(slot: Slot, id) => record((s) => choose(s, slot, id))} onType={(t) => record((s) => showPeep(s, t))} onFigure={(id) => record((s) => chooseFigure(s, id))} onDice={(t) => dice(t)}
        >
          <SceneSources
            state={state} onAdd={(what) => { setPicked(state.scene.length); record((s) => addToScene(s, boxes[boxKey(s)], what)) }}
            uploads={uploads} uploadNote={uploadNote} onUpload={upload} onDeleteUpload={removeUpload}
          />
        </PartPicker>

        <section className="pc-stage-wrap" aria-label="Preview">
          {inScene ? <>
            <div className="pc-stage" data-transparent={state.bg === 'transparent' || undefined} data-testid="pc-stage" data-view="scene" tabIndex={-1} style={{ '--pc-ratio': RATIOS[state.frame.ratio] } as CSSProperties}
              onPointerDown={grab} onPointerMove={pull} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
              <SceneView state={state} selected={selected} />
            </div>
            <div className="pc-frame">
              <div className="pc-pill" role="radiogroup" aria-label="Ratio">
                {(Object.keys(RATIOS) as Ratio[]).map((r) => <button key={r} role="radio" aria-checked={state.frame.ratio === r} onClick={() => record((s) => setRatio(s, r))}>{r}</button>)}
              </div>
              <Slider label="Zoom" value={state.frame.zoom} min={0.5} max={2} step={0.05} unit="×" reset={1} onChange={(zoom) => setHist((h) => tweak(h, { ...h.now, frame: { ...h.now.frame, zoom } }))} />
            </div>
            <p className="pc-hint">{state.scene.length ? <>Drag someone to move them, or the corner of the picked one to resize it. Press <kbd>F</kbd> to flip them.</> : 'Build a peep or pick a figure, then press "Add".'}</p>
          </> : <>
          <div style={{ display: 'contents' }} onClick={(e) => pickPart(e.target)}>
            <Stage state={state} box={box} measured={!!boxes[key]} onMeasure={onMeasure} />
          </div>
          <div className="pc-pill" role="group" aria-label="Type">
            {types.map((t) => <button key={t} aria-pressed={state.figure === null && state.type === t} onClick={() => record((s) => showPeep(s, t))}>{t}</button>)}
          </div>
          <p className="pc-hint">Click a part to open its tab. Press <kbd>F</kbd> to flip.{state.figure === null && ' Parts left alone use the defaults of the type.'}</p>
          </>}
        </section>

        <section ref={side} className={`pc-panel pc-side${inScene ? ' pc-side-scene' : ''}`} aria-label="Look">
          <Swatches label="Background" value={state.bg} options={swatches.bg} transparent used={used} onChange={(bg) => live({ bg })}
            action={!inScene && <Lock what="Background" locked={!!state.locked?.includes('bg')} onToggle={() => live(toggleLock(state, 'bg'))} />} />
          {!inScene && <button className="pc-btn pc-wide" aria-pressed={!!state.mono} onClick={() => record((s) => ({ ...s, mono: !s.mono }))} title="Black lines on white only, as the pack draws them"><I.contrast /><span>Contrast</span></button>}
          {inScene && (
            <SceneMembers
              state={state} selected={selected} onSelect={setPicked} used={used} onLive={(i, patch) => setHist((h) => tweak(h, updateEntry(h.now, i, patch)))}
              onCommit={(i, patch) => record((s) => updateEntry(s, i, patch))}
              onRemove={(i) => { setPicked(null); record((s) => removeEntry(s, i)) }}
              onMove={(i, by) => { setPicked(i + by); record((s) => moveEntry(s, i, by)) }}
            />
          )}
          {/* These edit the peep or figure being built; in the scene each member keeps the look it was added with. */}
          {!inScene && <>
          <Slider label="Scale" value={state.scale} min={0.5} max={1.5} step={0.05} reset={1} onChange={(scale) => live({ scale })} />
          <Slider label="Rotate" value={state.rotate} min={-180} max={180} step={5} unit="°" reset={0} onChange={(rotate) => live({ rotate })} />
          <button className="pc-btn pc-wide" aria-pressed={state.flip} onClick={() => live({ flip: !state.flip })}><I.flip /><span>Flip</span></button>
          </>}
          <div className="pc-export">
            <div className="pc-pill" role="radiogroup" aria-label="PNG size">
              {[1, 2, 3, 4].map((k) => <button key={k} role="radio" aria-checked={pngScale === k} onClick={() => setPngScale(k)}>{k}×</button>)}
            </div>
            <small aria-label={`PNG ${px.width} by ${px.height} pixels`}>{px.width}×{px.height}</small>
          </div>
          <div className="pc-save">
            <button className="pc-btn pc-primary" onClick={() => save('svg')}><I.download /><span>Save as SVG</span></button>
            <button className="pc-btn pc-primary" onClick={() => save('png')}><I.download /><span>Save as PNG</span></button>
          </div>
        </section>
      </div>
    </div>
  )
}
