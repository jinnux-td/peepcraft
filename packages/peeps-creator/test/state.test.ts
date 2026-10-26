import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choose, commit, optionsFor, partId, redo, setType, startHistory, tweak, undo } from '../src/state.ts'
import { initialState } from '../src/types.ts'

test('partId is the choice, else the default of the type', () => {
  assert.equal(partId(initialState, 'face'), 'smile')
  assert.equal(partId(choose(initialState, 'face', 'calm'), 'face'), 'calm')
  assert.equal(partId(initialState, 'body'), 'tee-1')
  assert.equal(partId(setType(initialState, 'sitting'), 'body'), 'crossed-legs')
})

test('changing type drops the body (a pose is not a torso) and keeps the other choices', () => {
  const s = setType(choose(choose(initialState, 'body', 'dress'), 'head', 'afro'), 'standing')
  assert.equal(s.parts.body, undefined)
  assert.equal(s.parts.head, 'afro')
  assert.equal(setType(initialState, 'bust'), initialState)
})

test('options of a slot come from the category of the type', () => {
  assert.equal(optionsFor('bust', 'body').length, 30)
  assert.equal(optionsFor('standing', 'body').length, 23)
  assert.equal(optionsFor('sitting', 'body').length, 11)
  assert.equal(optionsFor('sitting', 'head').length, 46)
})

test('history: commit is undoable and redoable, a new commit clears redo, a tweak is not a step', () => {
  let h = startHistory(initialState)
  h = commit(h, choose(h.now, 'face', 'calm'))
  h = tweak(h, { ...h.now, scale: 1.3 })
  assert.equal(h.past.length, 1)
  assert.equal(h.now.scale, 1.3)
  h = undo(h)
  assert.equal(h.now.parts.face, undefined)
  h = redo(h)
  assert.equal(h.now.parts.face, 'calm')
  h = undo(h); h = commit(h, choose(h.now, 'head', 'afro'))
  assert.equal(h.future.length, 0)
  assert.equal(undo(startHistory(initialState)).now, initialState)
})

test('history keeps the last 50 steps', () => {
  let h = startHistory(initialState)
  for (let i = 0; i < 80; i++) h = commit(h, { ...h.now, rotate: i })
  assert.equal(h.past.length, 50)
})
