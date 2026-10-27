// Small things for a table or a hand. Use the Lift of a scene member to put one on a table (a table top is 1350 high).
import { ellipse, poly, rect, thing } from '../thing.ts'

export const laptop = thing({ id: 'laptop', label: 'Laptop', group: 'small', width: 640, height: 440 }, [
  [rect(90, 15, 460, 320, 22)],
  [rect(125, 50, 390, 250, 10), 'ink'],
  [poly(20, 430, 620, 430, 550, 330, 90, 330)],
  ['M260 395H380', 'none'],
])

export const mug = thing({ id: 'mug', label: 'Mug', group: 'small', width: 260, height: 330 }, [
  ['M80 110C50 80 110 60 80 20M140 110C110 80 170 60 140 20', 'none'],
  ['M190 180C260 175 260 280 190 280', 'none'],
  [rect(30, 140, 170, 180, 30)],
])

export const books = thing({ id: 'books', label: 'Books', group: 'small', width: 470, height: 310 }, [
  [rect(20, 210, 430, 90, 14), 'covers'],
  ['M60 240H410M60 270H410', 'none'],
  [rect(55, 120, 380, 90, 14), 'ink'],
  [rect(30, 30, 400, 90, 14), 'covers'],
  ['M70 60H390M70 90H390', 'none'],
])

export const phone = thing({ id: 'phone', label: 'Phone', group: 'small', width: 150, height: 290 }, [
  [rect(15, 10, 120, 270, 26)],
  [rect(30, 45, 90, 195, 8), 'ink'],
  [ellipse(75, 260, 8), 'ink'],
])

export const ball = thing({ id: 'ball', label: 'Ball', group: 'small', width: 440, height: 440 }, [
  [ellipse(220, 220, 205)],
  ['M220 15C110 120 110 320 220 425C330 320 330 120 220 15Z', 'ink'],
  ['M15 220C120 180 320 180 425 220', 'none'],
  [ellipse(220, 220, 205), 'none'],
])

export const balloon = thing({ id: 'balloon', label: 'Balloon', group: 'small', width: 580, height: 1850 }, [
  ['M290 690C210 900 370 1100 290 1300S220 1620 290 1840', 'none'],
  [poly(262, 700, 318, 700, 290, 655)],
  ['M290 660C120 660 20 500 20 340C20 160 150 20 290 20C430 20 560 160 560 340C560 500 460 660 290 660Z'],
  ['M140 230C170 160 220 120 270 105', 'none'],
])
