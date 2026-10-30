export { TOKEN_NAMES, COLOR_ROLES, MODES, SCALES, BRANDS, BREAKPOINTS, brandColors, unknownTokens } from './tokens.ts';
export type { Mode, ColorRole, Colors, Brand, ScaleName } from './tokens.ts';
export { tokensCss, tailwindCss, toShadcnCss, fromShadcnCss, tokensJson, SHADCN } from './build.ts';
export { contrast, over, parseHex } from './color.ts';

import { tokensCss } from './build.ts';
// The tokens as one CSS string, for a package that injects its own <style> (no CSS loader needed).
export const TOKENS_CSS: string = tokensCss();
