// Small stroke icons (24 x 24, currentColor), drawn for this mock.
import type { ReactNode } from 'react'

const draw = (children: ReactNode) => () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

export const icons = {
  type: draw(<><circle cx="12" cy="5" r="2.5" /><path d="M12 8v7M8 11h8M10 21l2-6 2 6" /></>),
  body: draw(<path d="M8 4 3 7l2 4 3-1v10h8V10l3 1 2-4-5-3c0 2-1.5 3-4 3S8 6 8 4z" />),
  head: draw(<path d="M12 3c-4 0-7 3-7 7v3c0 2 1 3 2 3v-6c3 0 6-1 8-3 1 1 2 2 2 4v5c1 0 2-1 2-3v-3c0-4-3-7-7-7z" />),
  face: draw(<><circle cx="12" cy="12" r="9" /><path d="M8 14c1.2 1.6 2.6 2.4 4 2.4s2.8-.8 4-2.4M9 9.5h.01M15 9.5h.01" /></>),
  facialHair: draw(<path d="M3 13c3-4 6-2 9 0 3-2 6-4 9 0-3 1-5 5-9 1-4 4-6 0-9-1z" />),
  accessories: draw(<><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14h4M3 14l2-6M21 14l-2-6" /></>),
  dice: draw(<><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" /></>),
  figure: draw(<><circle cx="13" cy="4.5" r="2" /><path d="m10 21 2-6-3-3 2-5 4 3 3 1M12 15l4 6" /></>),
  scene: draw(<><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 16h18M8 16v-4M8 9.5h.01M15 16v-5M15 8.5h.01" /></>),
  shuffle: draw(<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />),
  undo: draw(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  redo: draw(<><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>),
  reset: draw(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>),
  download: draw(<path d="M12 3v12M7 10l5 5 5-5M4 21h16" />),
  flip: draw(<path d="M12 3v18M8 7 3 12l5 5V7zM16 7l5 5-5 5V7z" />),
  theme: draw(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>),
  clear: draw(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m4 20 16-16" /></>),
  front: draw(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5V4H4v11h1" /></>),
  back: draw(<><rect x="4" y="4" width="11" height="11" rx="2" /><path d="M9 19v1h11V9h-1" /></>),
  remove: draw(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />),
  add: draw(<path d="M12 5v14M5 12h14" />),
  upload: draw(<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />),
  more: draw(<path strokeWidth="3.2" d="M5 6h.01M12 6h.01M19 6h.01M5 12h.01M12 12h.01M19 12h.01M5 18h.01M12 18h.01M19 18h.01" />),
  close: draw(<path d="M6 6l12 12M18 6 6 18" />),
  contrast: draw(<><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>),
  grid: draw(<><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>),
  list: draw(<><rect x="4" y="4.5" width="5" height="5" rx="1.2" /><rect x="4" y="14.5" width="5" height="5" rx="1.2" /><path d="M12.5 7h7.5M12.5 17h7.5" /></>),
  lock: draw(<><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  unlock: draw(<><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></>),
  none: draw(<><circle cx="12" cy="12" r="8" /><path d="m6.3 6.3 11.4 11.4" /></>),
}
export type IconName = keyof typeof icons
