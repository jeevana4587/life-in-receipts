import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getChapterMarkers,
  chapterForDay,
} from '../src/lib/chapters.js'

test('chapter markers are computed, ordered, and capped', () => {
  const markers = getChapterMarkers()
  assert.ok(markers.length >= 1, 'expected at least one chapter marker')
  assert.ok(markers.length <= 8)

  for (let i = 1; i < markers.length; i += 1) {
    assert.ok(markers[i].dayStart > markers[i - 1].dayStart)
  }
})

test('each chapter is dense enough and internally consistent', () => {
  for (const marker of getChapterMarkers()) {
    assert.ok(marker.count >= 12, `chapter ${marker.id} too sparse`)
    assert.ok(marker.receiptIds.length === marker.count)
    assert.ok(marker.dayEnd >= marker.dayStart)
    assert.ok(marker.title.length > 0)
    assert.ok(marker.subtitle.includes(String(marker.count)))
  }
})

test('chapters do not overlap in days', () => {
  const markers = getChapterMarkers()
  for (let i = 1; i < markers.length; i += 1) {
    assert.ok(
      markers[i].dayStart > markers[i - 1].dayEnd,
      `chapter ${markers[i].id} overlaps ${markers[i - 1].id}`,
    )
  }
})

test('chapterForDay resolves inside chapters and returns null outside', () => {
  const markers = getChapterMarkers()
  const first = markers[0]
  const inside = chapterForDay(first.dayStart)
  assert.ok(inside)
  assert.equal(inside.id, first.id)

  // A date outside the dataset range resolves to nothing.
  assert.equal(chapterForDay('1999-01-01'), null)
})