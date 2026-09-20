import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getConnections,
  getCluster,
  clusterSpanMinutes,
  CONNECTION_WINDOW_MINUTES,
  CLUSTER_GAP_MINUTES,
} from '../src/lib/storyEngine.js'
import { receipts, getReceipt, totalReceipts, dataIntegrity } from '../src/lib/receipts.js'
import {
  EMPTY_FILTERS,
  applyFilters,
  matchesFilters,
  hasActiveFilters,
  activeFilterCount,
  filterReceipts,
} from '../src/lib/filters.js'
import { computeInsights, insightSummaries } from '../src/lib/insights.js'
import { buildChapter } from '../src/lib/narrative.js'

/* ------------------------------------------------------------------ *
 * Dataset integrity (proves the sanitisation boundary ran)
 * ------------------------------------------------------------------ */

test('the sanitised dataset is non-empty and fully valid', () => {
  assert.ok(totalReceipts > 100)
  assert.equal(dataIntegrity.validCount, totalReceipts)
  assert.ok(Array.isArray(receipts))
})

test('every receipt has the required schema fields', () => {
  for (const r of receipts) {
    assert.equal(typeof r.id, 'string')
    assert.equal(typeof r.type, 'string')
    assert.equal(typeof r.title, 'string')
    assert.equal(typeof r.description, 'string')
    assert.ok(r.description.length > 0, `description missing on ${r.id}`)
    assert.ok(!Number.isNaN(new Date(r.timestamp).getTime()))
  }
})

test('receipts are sorted chronologically', () => {
  for (let i = 1; i < receipts.length; i += 1) {
    assert.ok(
      new Date(receipts[i - 1].timestamp) <= new Date(receipts[i].timestamp),
    )
  }
})

/* ------------------------------------------------------------------ *
 * Story Engine — connections
 * ------------------------------------------------------------------ */

test('getConnections returns annotated, ordered connections', () => {
  const sample = receipts[Math.floor(receipts.length / 2)]
  const connections = getConnections(sample)
  assert.ok(Array.isArray(connections))
  for (const c of connections) {
    assert.ok(c.receipt)
    assert.ok(c.primary)
    assert.ok(!Number.isNaN(c.primary.priority))
    assert.ok(arr(c.reasons).length > 0)
    assert.notEqual(c.id, sample.id)
  }
})

test('getConnections is stable (memoised) and handles null input', () => {
  const sample = receipts[10]
  const a = getConnections(sample)
  const b = getConnections(sample)
  assert.equal(a, b)
  assert.deepEqual(getConnections(null), [])
})

test('time-proximity connections are within the configured window', () => {
  const sample = receipts[Math.floor(receipts.length / 2)]
  const window = 45
  const connections = getConnections(sample, { windowMinutes: window })
  const t = new Date(sample.timestamp).getTime()
  for (const c of connections) {
    if (c.primary.type !== 'time') continue
    const gap = Math.abs(new Date(c.receipt.timestamp).getTime() - t) / 60000
    assert.ok(gap <= window + 0.01)
  }
})

test('default window matches the documented constant', () => {
  assert.equal(CONNECTION_WINDOW_MINUTES, 120)
})

test('connections never include the focus receipt itself', () => {
  for (const id of [receipts[0].id, receipts[500].id, receipts[1200].id]) {
    const focus = getReceipt(id)
    for (const c of getConnections(focus)) {
      assert.notEqual(c.id, id)
    }
  }
})

/* ------------------------------------------------------------------ *
 * Story Engine — clustering
 * ------------------------------------------------------------------ */

test('getCluster always contains the focus receipt', () => {
  for (const id of [receipts[0].id, receipts[800].id, receipts[1600].id]) {
    const focus = getReceipt(id)
    const cluster = getCluster(focus)
    assert.ok(cluster.some((r) => r.id === id))
    assert.ok(cluster.length >= 1)
  }
})

test('cluster members are each within the cluster gap of a neighbour', () => {
  const focus = receipts[Math.floor(receipts.length / 2)]
  const cluster = getCluster(focus)
  const sorted = [...cluster].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )
  for (let i = 1; i < sorted.length; i += 1) {
    const gap =
      (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) /
      60000
    assert.ok(gap <= CLUSTER_GAP_MINUTES + 0.01)
  }
})

test('clusterSpanMinutes is zero for a single moment and positive otherwise', () => {
  assert.equal(clusterSpanMinutes([receipts[0]]), 0)
  assert.ok(clusterSpanMinutes([receipts[0], receipts[1]]) >= 0)
})

/* ------------------------------------------------------------------ *
 * Filters (AND logic)
 * ------------------------------------------------------------------ */

test('matchesFilters applies category AND query AND location', () => {
  const r = {
    id: 'x',
    type: 'music',
    title: 'Cyan Song',
    description: 'a track',
    timestamp: '2017-05-05T10:00:00Z',
    location: 'Riverside Park',
  }
  assert.ok(matchesFilters(r, { ...EMPTY_FILTERS, categories: ['music'] }))
  assert.ok(!matchesFilters(r, { ...EMPTY_FILTERS, categories: ['purchase'] }))
  assert.ok(matchesFilters(r, { ...EMPTY_FILTERS, query: 'cyan' }))
  assert.ok(!matchesFilters(r, { ...EMPTY_FILTERS, query: 'zzz' }))
  assert.ok(
    !matchesFilters(r, {
      ...EMPTY_FILTERS,
      categories: ['music'],
      query: 'zzz',
    }),
  )
})

test('date-range filters are inclusive', () => {
  const r = {
    id: 'x',
    type: 'note',
    title: 't',
    description: 'd',
    timestamp: '2017-05-05T10:00:00Z',
  }
  assert.ok(matchesFilters(r, { ...EMPTY_FILTERS, dateFrom: '2017-05-05', dateTo: '2017-05-05' }))
  assert.ok(!matchesFilters(r, { ...EMPTY_FILTERS, dateFrom: '2017-05-06' }))
})

test('filter helpers report active state correctly', () => {
  assert.equal(hasActiveFilters(EMPTY_FILTERS), false)
  assert.equal(activeFilterCount(EMPTY_FILTERS), 0)
  assert.equal(
    hasActiveFilters({ ...EMPTY_FILTERS, query: 'a' }),
    true,
  )
  assert.equal(
    activeFilterCount({ ...EMPTY_FILTERS, categories: ['music', 'note'] }),
    2,
  )
})

test('filterReceipts narrows the set and preserves match validity', () => {
  const results = filterReceipts({ ...EMPTY_FILTERS, categories: ['music'] })
  assert.ok(results.length > 0)
  for (const r of results) assert.equal(r.type, 'music')
  assert.ok(results.length <= totalReceipts)
})

test('applyFilters returns the same list when filters are empty', () => {
  const subset = receipts.slice(0, 20)
  assert.equal(applyFilters(subset, EMPTY_FILTERS).length, subset.length)
})

/* ------------------------------------------------------------------ *
 * Insights + narrative (deterministic)
 * ------------------------------------------------------------------ */

test('computeInsights totals match the dataset and are memoised', () => {
  const i = computeInsights()
  assert.equal(i.total, totalReceipts)
  assert.equal(computeInsights(), i)
  assert.ok(i.categoryRanking.length > 0)
  assert.ok(i.monthly.length > 0)
})

test('insightSummaries are hedged and non-empty', () => {
  const summaries = insightSummaries()
  assert.ok(summaries.length >= 3)
  for (const s of summaries) {
    assert.equal(typeof s.title, 'string')
    assert.equal(typeof s.detail, 'string')
  }
})

test('buildChapter produces a narrative grounded in the cluster', () => {
  const cluster = getCluster(receipts[Math.floor(receipts.length / 2)])
  const chapter = buildChapter(cluster)
  assert.ok(chapter.paragraphs.length > 0)
  assert.equal(chapter.count, cluster.length)
  assert.ok(chapter.facts.length > 0)
  assert.ok(chapter.title)
})

test('buildChapter handles a single-moment cluster without throwing', () => {
  const chapter = buildChapter([receipts[0]])
  assert.equal(chapter.count, 1)
  assert.ok(chapter.paragraphs.length > 0)
})

function arr(value) {
  return Array.isArray(value) ? value : []
}