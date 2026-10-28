// Chairs, a sofa, tables. Sizes follow the peeps (about 18 units per cm): a seat is about 45 cm high, a table 75 cm.
import { ellipse, poly, rect, thing } from '../thing.ts'

export const chair = thing({ id: 'chair', label: 'Chair', group: 'furniture', width: 820, height: 1640 }, [
  [poly(70, 30, 170, 20, 175, 840, 75, 840), 'seat'],
  [rect(95, 110, 55, 230, 20), 'none'],
  [rect(40, 790, 740, 95, 40), 'seat'],
  [poly(85, 885, 160, 885, 145, 1630, 100, 1630)],
  [poly(660, 885, 735, 885, 720, 1630, 675, 1630)],
  ['M150 1270L680 1270', 'none'],
], { seat: '#c9773e' })

export const stool = thing({ id: 'stool', label: 'Stool', group: 'furniture', width: 720, height: 1170 }, [
  [poly(150, 120, 210, 120, 110, 1160, 60, 1160)],
  [poly(510, 120, 570, 120, 660, 1160, 610, 1160)],
  [poly(335, 120, 385, 120, 380, 1160, 340, 1160)],
  ['M120 760Q360 820 600 760', 'none'],
  [rect(30, 20, 660, 120, 60), 'seat'],
  ['M90 60Q360 40 630 60', 'none'],
], { seat: '#7b4a2a' })

export const sofa = thing({ id: 'sofa', label: 'Sofa', group: 'furniture', width: 3600, height: 1540 }, [
  [rect(230, 110, 3140, 720, 130)],
  ['M1800 150V760', 'none'],
  [rect(250, 1300, 100, 230, 25), 'ink'],
  [rect(3250, 1300, 100, 230, 25), 'ink'],
  [rect(60, 760, 3480, 560, 70)],
  [rect(300, 640, 1510, 230, 80), 'cushions'],
  [rect(1790, 640, 1510, 230, 80), 'cushions'],
  [rect(20, 470, 340, 880, 150)],
  [rect(3240, 470, 340, 880, 150)],
], { cushions: '#ff8fa3' })

export const table = thing({ id: 'table', label: 'Table', group: 'furniture', width: 2160, height: 1350 }, [
  [rect(110, 90, 1940, 130, 10)],
  [poly(160, 200, 260, 200, 245, 1340, 175, 1340)],
  [poly(1900, 200, 2000, 200, 1985, 1340, 1915, 1340)],
  [rect(10, 20, 2140, 95, 40), 'top'],
], { top: '#c9773e' })

export const desk = thing({ id: 'desk', label: 'Desk', group: 'furniture', width: 2520, height: 1350 }, [
  [rect(70, 100, 790, 1240, 20)],
  [rect(120, 160, 690, 330, 24), 'drawers'],
  [rect(120, 540, 690, 330, 24), 'drawers'],
  [rect(120, 920, 690, 360, 24), 'drawers'],
  [ellipse(465, 325, 34), 'ink'],
  [ellipse(465, 705, 34), 'ink'],
  [ellipse(465, 1100, 34), 'ink'],
  [poly(2340, 100, 2440, 100, 2430, 1340, 2350, 1340)],
  [rect(10, 20, 2500, 100, 40), 'top'],
], { drawers: '#ffe066', top: '#c9773e' })
