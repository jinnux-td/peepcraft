// Plants, a lamp, a bookshelf, a rug.
import { ellipse, leaf, poly, rect, thing, vein, type Part } from '../thing.ts'

/** Leaves fanning out from one point: [angle, length] each, drawn in the order given (later ones in front). */
const fan = (x: number, y: number, leaves: ReadonlyArray<[number, number]>, width?: number): Part[] =>
  leaves.flatMap(([a, l]): Part[] => [[leaf(x, y, a, l, width), 'leaves'], [vein(x, y, a, l), 'none']])

export const pottedPlant = thing({ id: 'potted-plant', label: 'Potted plant', group: 'home', width: 760, height: 1100 }, [
  ...fan(380, 560, [[-150, 380], [-30, 380], [-120, 470], [-60, 470], [-95, 520], [-170, 300], [-10, 300]]),
  [poly(160, 600, 600, 600, 535, 1090, 225, 1090)],
  [rect(125, 545, 510, 100, 30)],
])

/** A tall plant: leaves along a stem, alternating sides. */
const stem = (x: number, top: number, bottom: number): Part[] => {
  const out: Part[] = [[`M${x} ${bottom}Q${x - 40} ${(top + bottom) / 2} ${x + 10} ${top}`, 'none']]
  for (let i = 0; i < 7; i++) {
    const y = bottom - 120 - i * ((bottom - top - 120) / 7), side = i % 2 ? 1 : -1, l = 520 - i * 35
    out.push([leaf(x, y, side > 0 ? -35 - i * 4 : -145 + i * 4, l, 0.45), 'leaves'], [vein(x, y, side > 0 ? -35 - i * 4 : -145 + i * 4, l), 'none'])
  }
  return out
}

export const tallPlant = thing({ id: 'tall-plant', label: 'Tall plant', group: 'home', width: 1300, height: 2900 }, [
  ...stem(650, 380, 2250),
  [leaf(660, 380, -95, 330, 0.45), 'leaves'],
  [vein(660, 380, -95, 330), 'none'],
  [poly(330, 2250, 970, 2250, 900, 2890, 400, 2890)],
  [rect(290, 2190, 720, 120, 40)],
])

export const floorLamp = thing({ id: 'floor-lamp', label: 'Floor lamp', group: 'home', width: 900, height: 2980 }, [
  [rect(428, 600, 44, 2320, 22)],
  [ellipse(450, 2920, 250, 50)],
  ['M450 560V720', 'none'],
  [poly(300, 120, 600, 120, 770, 640, 130, 640), 'shade'],
  ['M190 600H710', 'none'],
])

/** Books standing on a shelf from x0 to x1 at y: [width, height, dark] each, with a gap after a leaning one. */
const books = (x0: number, y: number, list: ReadonlyArray<[number, number, boolean?]>): Part[] => {
  let x = x0
  return list.map(([w, h, dark]): Part => { const p: Part = [rect(x, y - h, w, h, 12), dark ? 'ink' : 'books']; x += w + 6; return p })
}

export const bookshelf = thing({ id: 'bookshelf', label: 'Bookshelf', group: 'home', width: 1640, height: 3240 }, [
  [rect(20, 20, 1600, 3200, 24)],
  [rect(80, 80, 1480, 3040, 10)],
  ...books(120, 780, [[110, 560], [90, 610, true], [130, 520], [100, 640], [140, 560, true], [90, 600], [120, 500]]),
  [poly(1080, 780, 1180, 780, 1450, 300, 1350, 260), 'books'],
  [rect(80, 780, 1480, 60, 8)],
  ...books(150, 1580, [[130, 620, true], [100, 560], [110, 640], [90, 520, true], [140, 600], [100, 580], [120, 640, true], [110, 540]]),
  [rect(80, 1580, 1480, 60, 8)],
  ...books(120, 2380, [[160, 520], [100, 600, true], [130, 640], [90, 560]]),
  [ellipse(1200, 2240, 140, 140)],
  [rect(1110, 2240, 180, 140, 20)],
  [rect(80, 2380, 1480, 60, 8)],
  [rect(250, 2700, 1140, 360, 30)],
  [ellipse(820, 2880, 40), 'ink'],
])

export const rug = thing({ id: 'rug', label: 'Rug', group: 'home', width: 4000, height: 380 }, [
  [ellipse(2000, 190, 1960, 170)],
  [ellipse(2000, 190, 1660, 120), 'none'],
  [ellipse(2000, 190, 1300, 80), 'centre'],
])
