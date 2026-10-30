import test from 'node:test';
import assert from 'node:assert/strict';
import { unknownTokens } from '@kit/tokens';
import { UI_CSS } from '../src/css.ts';

test('UI_CSS reads only kit tokens that exist, and no raw colour', () => {
  assert.deepEqual(unknownTokens(UI_CSS), []);
  assert.doesNotMatch(UI_CSS, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
});

test('every component in docs/ui/components.md has its class', () => {
  for (const c of ['k-btn', 'k-input', 'k-field', 'k-label', 'k-hint', 'k-error', 'k-check', 'k-switch', 'k-slider', 'k-seg', 'k-tabs', 'k-card', 'k-chip', 'k-dialog', 'k-menu', 'k-tip', 'k-toasts', 'k-toast', 'k-skeleton', 'k-spinner', 'k-empty', 'k-banner'])
    assert.match(UI_CSS, new RegExp(`\\.${c}\\b`), c);
});

test('hover only inside @media (hover:hover)', () => {
  const at = UI_CSS.indexOf('@media (hover:hover){');
  assert.ok(at > 0);
  const end = UI_CSS.indexOf('\n}\n', at);
  assert.doesNotMatch(UI_CSS.slice(0, at) + UI_CSS.slice(end), /:hover/);
});

test('every interactive control has a focus-visible ring, and states come from attributes', () => {
  for (const sel of ['.k-btn:focus-visible', '.k-input:focus-visible', '.k-check input:focus-visible', '.k-switch:focus-visible', 'input[type=range]:focus-visible', '.k-seg>[role=radio]:focus-visible', '.k-tabs [role=tab]:focus-visible', 'button.k-chip:focus-visible', '[role^=menuitem]:focus-visible', '.k-card:has(.k-card-link:focus-visible)'])
    assert.ok(UI_CSS.includes(sel), sel);
  for (const a of ['[aria-pressed=true]', '[aria-checked=true]', '[aria-selected=true]', '[aria-invalid=true]', '[aria-busy=true]', ':disabled']) assert.ok(UI_CSS.includes(a), a);
  assert.doesNotMatch(UI_CSS, /\.(is-|active\b|selected\b|disabled\b)/, 'no state classes');
});

test('motion: reduced-motion rules exist, braces balance', () => {
  assert.match(UI_CSS, /@media \(prefers-reduced-motion:reduce\)/);
  assert.equal(UI_CSS.split('{').length, UI_CSS.split('}').length);
});
