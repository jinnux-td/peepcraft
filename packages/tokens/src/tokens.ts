// The one place the kit's raw visual values are written (docs/ui/tokens.md). Everything else is generated from this file by
// `npm run build`: css/tokens.css, css/tailwind.css, css/to-shadcn.css, css/from-shadcn.css and tokens.json.

// Primitives: the palette. Private to this package; components read the semantic roles below, never these.
const P = {
  paper: '#f6f5f1', white: '#ffffff', sand100: '#f0eee8', sand300: '#d9d6cd', sand500: '#8c897f', sand600: '#6e6c66', ink: '#1b1b1a',
  night: '#121211', night1: '#1c1c1a', night2: '#262624', night3: '#34332f', night5: '#6f6d66', fog: '#9a988f', bone: '#ecebe6',
  blue: '#2f6fde', blueSoft: '#7aa7ff',
  red: '#b42318', redSoft: '#ff7b72', green: '#1e7d45', greenSoft: '#4cc38a', amber: '#8f5a00', amberSoft: '#f0b429',
};

export type Mode = 'light' | 'dark';

// Semantic colour roles: what a value is for. `page-fill` is the page's `background` (a gradient in some brands); `page` is
// the solid colour checked for contrast, so a brand with a gradient sets `page` to the stop with the least contrast to its text.
// `popover` is the opaque background of what floats in the top layer (dialog, menu, tooltip, toast), where a translucent surface
// would show whatever is under it. `line` is a divider (no contrast rule); `line-strong` is a boundary that identifies a control (inputs, checkboxes): 3:1.
export const COLOR_ROLES = [
  'page', 'page-fill', 'surface', 'surface-2', 'popover', 'text', 'muted', 'line', 'line-strong',
  'accent', 'on-accent', 'focus', 'danger', 'on-danger', 'success', 'warning', 'overlay', 'over',
] as const;
export type ColorRole = (typeof COLOR_ROLES)[number];
export type Colors = Record<ColorRole, string>;

export const MODES: Record<Mode, Colors> = {
  light: {
    page: P.paper, 'page-fill': P.paper, surface: P.white, 'surface-2': P.sand100, popover: P.white, text: P.ink, muted: P.sand600,
    line: P.sand300, 'line-strong': P.sand500, accent: P.ink, 'on-accent': P.white, focus: P.blue,
    danger: P.red, 'on-danger': P.white, success: P.green, warning: P.amber, overlay: '#1b1b1a73', over: P.white,
  },
  dark: {
    page: P.night, 'page-fill': P.night, surface: P.night1, 'surface-2': P.night2, popover: P.night1, text: P.bone, muted: P.fog,
    line: P.night3, 'line-strong': P.night5, accent: P.bone, 'on-accent': P.night, focus: P.blueSoft,
    danger: P.redSoft, 'on-danger': P.night, success: P.greenSoft, warning: P.amberSoft, overlay: '#000000a6', over: P.white,
  },
};

// Scales: the same in both modes. A brand may replace fonts, radius, shadow and blur.
export const SCALES = {
  'font-sans': 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  'font-display': 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  'font-serif': 'ui-serif,"Iowan Old Style",Georgia,serif',
  'font-mono': 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
  'text-xs': '12px', 'text-sm': '14px', 'text-base': '16px', 'text-lg': '18px', 'text-xl': '20px',
  'text-2xl': '24px', 'text-3xl': '30px', 'text-4xl': '36px', 'text-5xl': '48px', 'text-6xl': '60px',
  'text-display': 'clamp(40px,6cqi,96px)',
  'leading-tight': '1.1', 'leading-snug': '1.3', 'leading-normal': '1.55',
  // space-N is N × 4 px, the same steps as Tailwind's spacing scale
  'space-1': '4px', 'space-2': '8px', 'space-3': '12px', 'space-4': '16px', 'space-5': '20px', 'space-6': '24px', 'space-8': '32px',
  'space-10': '40px', 'space-12': '48px', 'space-16': '64px', 'space-20': '80px', 'space-24': '96px', 'space-32': '128px',
  gutter: 'clamp(16px,4vw,40px)', section: 'clamp(64px,9vw,128px)', content: '1200px',
  'radius-sm': '6px', 'radius-md': '10px', 'radius-lg': '16px', 'radius-xl': '24px', 'radius-full': '999px',
  'shadow-sm': '0 1px 2px #1b1b1a14', 'shadow-md': '0 4px 16px #1b1b1a14', 'shadow-lg': '0 16px 48px #1b1b1a1f',
  blur: '0px',
  'dur-fast': '120ms', 'dur-base': '200ms', 'dur-slow': '320ms',
  'ease-out': 'cubic-bezier(.2,.7,.3,1)', 'ease-in-out': 'cubic-bezier(.6,0,.3,1)',
  'z-sticky': '20', 'z-dropdown': '40', 'z-overlay': '50', 'z-dialog': '60', 'z-toast': '70',
} as const;
export type ScaleName = keyof typeof SCALES;

// Breakpoints cannot be CSS variables inside a media or container query, so they are numbers (docs/ui/responsive.md).
// phone ≤ 767, tablet 768–1023, desktop 1024–1439, wide ≥ 1440.
export const BREAKPOINTS = { tablet: 768, desktop: 1024, wide: 1440 } as const;

// Brand themes: a partial override, and nothing else (a new rule needs a new token first). A brand either fixes the mode
// (`mode` and `colors`: noir is always dark), or follows the page's mode with its own colours for each (`light` and `dark`).
export type Brand = { scales?: Partial<Record<ScaleName, string>> }
  & ({ mode: Mode; colors: Partial<Colors> } | { light: Partial<Colors>; dark: Partial<Colors> });

const rounded = 'ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"Segoe UI",sans-serif';

// PeepCraft's four themes, from packages/peeps-creator/src/styles.ts. Glass, noir and violet are darkened where
// the creator's values miss the contrast pairs (README: "Brand themes").
export const BRANDS: Record<string, Brand> = {
  sunny: {
    mode: 'light',
    colors: {
      page: '#fffbf0', 'page-fill': '#fffbf0', surface: '#ffffff', 'surface-2': '#faf5e4', text: '#1b1b1b', muted: '#6f6a5c',
      line: '#eee6cf', 'line-strong': '#8f8770', accent: '#f7d56e', 'on-accent': '#1b1b1b', focus: '#1b1b1b',
    },
    scales: { 'font-sans': rounded, 'font-display': rounded, 'radius-md': '14px', 'radius-lg': '28px', 'radius-xl': '36px', 'shadow-lg': '0 12px 40px #0000001a' },
  },
  glass: {
    mode: 'light',
    colors: {
      page: '#b4b9cc', 'page-fill': 'linear-gradient(135deg,#b4b9cc,#d9c9cf 60%,#c3c8dc)', surface: '#ffffff55', 'surface-2': '#ffffff66', popover: '#ffffff',
      text: '#1f2433', muted: '#3f4659', line: '#ffffff99', 'line-strong': '#575e71', accent: '#2f5cf0', 'on-accent': '#ffffff',
      focus: '#1f2433', danger: '#8a1810', success: '#145a33', warning: '#5f3c00', overlay: '#1f243359',
    },
    scales: { 'font-sans': rounded, 'font-display': rounded, 'radius-md': '13px', 'radius-lg': '26px', 'radius-xl': '34px', 'shadow-lg': '0 20px 60px #1f243326', blur: '22px' },
  },
  noir: {
    mode: 'dark',
    colors: {
      page: '#2a2a2e', 'page-fill': 'radial-gradient(1200px 700px at 70% 10%,#2a2a2e,#101012)', surface: '#ffffff0a', 'surface-2': '#ffffff08', popover: '#1c1c20',
      text: '#f1efe9', muted: '#b5b2a9', line: '#ffffff1f', 'line-strong': '#ffffff61', accent: '#f0a431', 'on-accent': '#1a1204', focus: '#f0a431', danger: '#ff8a82',
    },
    scales: { 'font-sans': rounded, 'font-display': rounded, 'radius-md': '8px', 'radius-lg': '14px', 'radius-xl': '20px', 'shadow-lg': '0 24px 70px #000000a0', blur: '18px' },
  },
  violet: {
    mode: 'dark',
    colors: {
      page: '#5346bd', 'page-fill': 'linear-gradient(160deg,#4b3fb3,#5346bd 55%,#4235a3)', surface: '#ffffff0f', 'surface-2': '#ffffff0a', popover: '#6457c4',
      text: '#ffffff', muted: '#f4f2ff', line: '#ffffff40', 'line-strong': '#ffffffa6', accent: '#ff5c8a', 'on-accent': '#2b0614', focus: '#ffffff',
      danger: '#ffeded', success: '#b8f2d3', warning: '#ffe08a',
    },
    scales: { 'font-sans': rounded, 'font-display': rounded, 'radius-md': '12px', 'radius-lg': '24px', 'radius-xl': '32px', 'shadow-lg': '0 18px 50px #2a1f6a55', blur: '16px' },
  },
  // @kit/shell's dashboard palette: cool, with a green accent, in both modes. Every colour is solid, so it can follow the mode with light-dark().
  dashboard: {
    light: {
      page: '#e9eff5', 'page-fill': '#e9eff5', surface: '#ffffff', 'surface-2': '#f1f5f9', popover: '#ffffff', text: '#1b2733', muted: '#5a6b7b',
      line: '#cfd9e3', 'line-strong': '#728498', accent: '#16915a', 'on-accent': '#04120b', focus: '#16915a',
      danger: '#c62828', 'on-danger': '#ffffff', success: '#16915a', warning: '#8f5a00', overlay: '#1b273373', over: '#ffffff',
    },
    dark: {
      page: '#08121b', 'page-fill': '#08121b', surface: '#0f1d2b', 'surface-2': '#152739', popover: '#0f1d2b', text: '#dbe7f2', muted: '#8aa0b4',
      line: '#23384d', 'line-strong': '#56718b', accent: '#2fd07f', 'on-accent': '#04120b', focus: '#2fd07f',
      danger: '#ff5d5d', 'on-danger': '#04120b', success: '#2fd07f', warning: '#f0b429', overlay: '#000000a6', over: '#ffffff',
    },
  },
};

// A brand's full colour sets, one for each mode it has: that mode's colours with the brand's on top.
export const brandSets = (b: Brand): [Mode, Colors][] =>
  'mode' in b ? [[b.mode, { ...MODES[b.mode], ...b.colors }]] : (['light', 'dark'] as const).map((m) => [m, { ...MODES[m], ...b[m] }]);

// Every public name, without the `--k-` prefix. Packages may read only these (docs/ui/tokens.md, "Checks").
export const TOKEN_NAMES: readonly string[] = [...COLOR_ROLES, ...Object.keys(SCALES)];

// The --k-* names a stylesheet (or any source text) reads or sets that are not on the list: a typo, or a token that does not exist yet.
export const unknownTokens = (css: string): string[] =>
  [...new Set([...css.matchAll(/--k-([a-z0-9-]+)/g)].map((m) => m[1]))].filter((n) => !TOKEN_NAMES.includes(n));
