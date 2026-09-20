import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  sanitizeText,
  sanitizeTimestamp,
  sanitizeReceipts,
  validateReceipt,
  sanitizeSearchQuery,
} from '../src/lib/sanitize.js'
import {
  formatCount,
  formatPercent,
  dayKey,
  humanizeGapMinutes,
  truncate,
  partOfDay,
} from '../src/lib/format.js'

/* ------------------------------------------------------------------ *
 * Sanitisation / validation
 * ------------------------------------------------------------------ */

test('sanitizeText strips control characters and collapses whitespace', () => {
  assert.equal(sanitizeText('  a\u0000b\t c  '), 'a b c')
})

test('sanitizeText rejects non-strings', () => {
  assert.equal(sanitizeText(null), '')
  assert.equal(sanitizeText(42), '')
  assert.equal(sanitizeText({}), '')
})

test('sanitizeText enforces a maximum length', () => {
  assert.equal(sanitizeText('x'.repeat(50), 10).length, 10)
})

test('sanitizeSearchQuery clamps query length', () => {
  assert.ok(sanitizeSearchQuery('y'.repeat(500)).length <= 120)
})

test('sanitizeTimestamp normalises valid input and rejects garbage', () => {
  assert.equal(
    sanitizeTimestamp('2017-01-01T00:00:00.000Z'),
    '2017-01-01T00:00:00.000Z',
  )
  assert.equal(sanitizeTimestamp('not-a-date'), null)
  assert.equal(sanitizeTimestamp({}), null)
})

test('validateReceipt rejects records missing required fields', () => {
  assert.equal(validateReceipt(null), null)
  assert.equal(validateReceipt({}), null)
  assert.equal(validateReceipt({ id: 'x', type: 'bogus', timestamp: '2017-01-01' }), null)
  assert.equal(validateReceipt({ id: 'x', type: 'music', timestamp: 'nope' }), null)
})

test('validateReceipt accepts a well-formed record and drops unsafe metadata', () => {
  const out = validateReceipt({
    id: 'music-1',
    type: 'music',
    title: 'Session',
    timestamp: '2017-01-01T00:00:00.000Z',
    description: 'ok',
    metadata: { trackCount: 3, evil: { nested: true }, fn: () => {} },
  })
  assert.equal(out.id, 'music-1')
  assert.equal(out.metadata.trackCount, 3)
  assert.equal(out.metadata.evil, undefined)
  assert.equal(out.metadata.fn, undefined)
})

test('sanitizeReceipts de-duplicates, validates, and sorts chronologically', () => {
  const clean = sanitizeReceipts([
    { id: 'b', type: 'note', title: 'B', timestamp: '2017-06-01T00:00:00Z', description: 'b' },
    { id: 'a', type: 'note', title: 'A', timestamp: '2017-01-01T00:00:00Z', description: 'a' },
    { id: 'a', type: 'note', title: 'DUPE', timestamp: '2017-02-01T00:00:00Z', description: 'x' },
    { id: 'bad', type: 'nope', timestamp: '2017-01-01', description: 'x' },
  ])
  assert.equal(clean.length, 2)
  assert.deepEqual(clean.map((r) => r.id), ['a', 'b'])
  assert.ok(Object.isFrozen(clean))
})

test('sanitizeReceipts tolerates non-array input', () => {
  assert.equal(sanitizeReceipts(null).length, 0)
  assert.equal(sanitizeReceipts('nope').length, 0)
})

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

test('formatCount compacts thousands', () => {
  assert.equal(formatCount(999), '999')
  assert.equal(formatCount(1275), '1.3k')
  assert.equal(formatCount(12000), '12k')
})

test('formatPercent rounds to whole percent', () => {
  assert.equal(formatPercent(0.428), '43%')
  assert.equal(formatPercent(0), '0%')
})

test('dayKey produces a stable YYYY-MM-DD key', () => {
  assert.equal(dayKey(new Date(2017, 0, 5)), '2017-01-05')
})

test('humanizeGapMinutes describes gaps in words', () => {
  assert.equal(humanizeGapMinutes(35), '35 minutes apart')
  assert.equal(humanizeGapMinutes(120), '2 hours apart')
  assert.equal(humanizeGapMinutes(1440), '1 day apart')
})

test('truncate keeps short strings and ellipsises long ones', () => {
  assert.equal(truncate('short', 10), 'short')
  assert.ok(truncate('a'.repeat(50), 10).endsWith('…'))
})

test('partOfDay buckets hours sensibly', () => {
  assert.equal(partOfDay(new Date(2017, 0, 1, 2)), 'Late night')
  assert.equal(partOfDay(new Date(2017, 0, 1, 9)), 'Morning')
  assert.equal(partOfDay(new Date(2017, 0, 1, 14)), 'Afternoon')
  assert.equal(partOfDay(new Date(2017, 0, 1, 19)), 'Evening')
  assert.equal(partOfDay(new Date(2017, 0, 1, 23)), 'Night')
})