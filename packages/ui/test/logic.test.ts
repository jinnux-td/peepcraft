import test from 'node:test';
import assert from 'node:assert/strict';
import { step, typeahead } from '../src/keys.ts';
import { place } from '../src/place.ts';

test('step: arrows wrap, Home/End, orientation, disabled items skipped', () => {
  assert.equal(step(0, 'ArrowRight', 3), 1);
  assert.equal(step(2, 'ArrowRight', 3), 0);
  assert.equal(step(0, 'ArrowLeft', 3), 2);
  assert.equal(step(1, 'ArrowDown', 3), null, 'horizontal ignores ArrowDown');
  assert.equal(step(1, 'ArrowDown', 3, 'vertical'), 2);
  assert.equal(step(1, 'ArrowRight', 3, 'vertical'), null);
  assert.equal(step(0, 'ArrowDown', 3, 'both'), 1);
  assert.equal(step(0, 'ArrowRight', 4, 'horizontal', (i) => i === 1 || i === 2), 3);
  assert.equal(step(2, 'Home', 4, 'horizontal', (i) => i === 0), 1);
  assert.equal(step(0, 'End', 4, 'horizontal', (i) => i === 3), 2);
  assert.equal(step(0, 'Enter', 3), null);
  assert.equal(step(0, 'ArrowRight', 2, 'horizontal', () => true), null);
});

test('typeahead: next match after the current item, wraps, repeated letter cycles', () => {
  const l = ['Copy', 'Cut', 'Paste', 'Delete', 'Duplicate'];
  assert.equal(typeahead(l, 0, 'c'), 1);
  assert.equal(typeahead(l, 1, 'c'), 0);
  assert.equal(typeahead(l, 0, 'pa'), 2);
  assert.equal(typeahead(l, 0, 'du'), 4);
  assert.equal(typeahead(l, 3, 'dd'), 4, 'dd cycles through the d items');
  assert.equal(typeahead(l, 0, 'x'), null);
});

test('place: below by default, flips above near the bottom, stays inside the viewport', () => {
  const view = { width: 400, height: 300 }, pop = { width: 120, height: 80 };
  assert.deepEqual(place({ top: 20, left: 30, width: 60, height: 30 }, pop, view), { top: 54, left: 30, side: 'bottom' });
  assert.deepEqual(place({ top: 250, left: 30, width: 60, height: 30 }, pop, view), { top: 166, left: 30, side: 'top' });
  assert.equal(place({ top: 20, left: 380, width: 20, height: 30 }, pop, view).left, 272, 'pushed in from the right edge');
  assert.equal(place({ top: 100, left: 100, width: 40, height: 20 }, pop, view, 'top', 'center').left, 60);
  assert.equal(place({ top: 30, left: 100, width: 40, height: 20 }, pop, view, 'top').side, 'bottom', 'no room above: flips below');
});
