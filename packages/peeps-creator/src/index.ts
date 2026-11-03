export { PeepCreator, type ExportedFile, type PeepCreatorProps } from './components/PeepCreator.tsx'
export { PhotoMenu, type PhotoAction } from './components/PhotoMenu.tsx'
export { PartPicker, tabs, nice } from './components/PartPicker.tsx'
export { Stage } from './components/Stage.tsx'
export { Swatches } from './components/Swatches.tsx'
export { ThemeMenu } from './components/ThemeMenu.tsx'
export { LookThumb, Thumb, type Boxes } from './components/Thumb.tsx'
export { SceneMembers, SceneSources } from './components/ScenePanel.tsx'
export { ColorTargets } from './components/ColorTargets.tsx'
export { peepTargets, thingTargets, type ColorTarget } from './colors.ts'
export { creatorCss } from './styles.ts'
export { svgToPng } from './png.ts'
export { themes, type Tab, type ThemeId } from './types.ts'
// The picture itself lives in @kit/peeps-engine; these names stay here so hosts of the creator keep working.
export {
  exportSceneSvg, exportSvg, fileName, randomize, slots, type Rng, type Target,
  drawn, entryBox, entryScale, fallbackBox, GROUND, LIFT, peepOf, Scene, SCENE, sceneOf, SceneView, SIZE, squareAround,
  addToScene, choose, chooseFigure, designColors, toHex, dragEntry, dropUpload, moveEntry, removeEntry, updateEntry, commit, optionsFor, partId, redo, setType, showPeep, startHistory, tweak, undo, type History,
  initialState, swatches, type CreatorState, type Parts, type SceneEntry, type Upload,
} from '@kit/peeps-engine'
export { ACCEPT, deleteUpload, loadUploads, MAX_BYTES, readUpload, saveUpload } from './uploads.ts'
