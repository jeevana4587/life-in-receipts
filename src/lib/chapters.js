import { receipts } from './receipts.js'
import { dayKey, formatMonthYear } from './format.js'

/**
 * Chapter markers — milestone signposts computed from dataset density.
 *
 * A "chapter" is a window of consecutive active days whose moment count
 * crosses a density threshold and whose span is long enough to feel like a
 * distinct period. Each chapter gets a hedged, evocative title derived only
 * from what the data shows (season + dominant category), never invented
 * biography. Pure functions; unit-tested.
 */

const MIN_MOMENTS = 12
const MIN_DAYS_SPAN = 4
const MAX_CHAPTERS = 8

/** Season label for a month index (northern-hemisphere, hedged wording). */
function seasonFor(monthIndex) {
  if ([11, 0, 1].includes(monthIndex)) return 'Winter'
  if ([2, 3, 4].includes(monthIndex)) return 'Spring'
  if ([5, 6, 7].includes(monthIndex)) return 'Summer'
  return 'Autumn'
}

let cache = null

/**
 * Compute chapter markers across the dataset.
 *
 * @returns {Array<{
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   dayStart: string,
 *   dayEnd: string,
 *   count: number,
 *   dominantType: string,
 *   receiptIds: string[],
 * }>}
 */
export function getChapterMarkers() {
  if (cache) return cache

  // Bucket receipts by day.
  const byDay = new Map()
  for (const r of receipts) {
    const key = dayKey(r.timestamp)
    const bucket = byDay.get(key) ?? { ids: [], typeCounts: {} }
    bucket.ids.push(r.id)
    bucket.typeCounts[r.type] = (bucket.typeCounts[r.type] || 0) + 1
    byDay.set(key, bucket)
  }

  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, bucket]) => ({
      key,
      ids: bucket.ids,
      typeCounts: bucket.typeCounts,
      count: bucket.ids.length,
    }))

  // Slide a 5-day window; keep the densest non-overlapping windows.
  const WINDOW = 5
  const candidates = []

  for (let i = 0; i + WINDOW <= days.length; i += 1) {
    const slice = days.slice(i, i + WINDOW)
    const count = slice.reduce((sum, d) => sum + d.count, 0)
    if (count < MIN_MOMENTS) continue

    const typeCounts = {}
    for (const d of slice) {
      for (const [type, n] of Object.entries(d.typeCounts)) {
        typeCounts[type] = (typeCounts[type] || 0) + n
      }
    }
    const [dominantType] = Object.entries(typeCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]

    candidates.push({
      dayStart: slice[0].key,
      dayEnd: slice[slice.length - 1].key,
      count,
      dominantType,
      receiptIds: slice.flatMap((d) => d.ids),
    })
  }

  // Greedily pick densest candidates that don't overlap already-picked ones.
  const picked = []
  const usedDays = new Set()
  candidates.sort((a, b) => b.count - a.count)

  for (const candidate of candidates) {
    if (picked.length >= MAX_CHAPTERS) break
    const overlaps = candidate.receiptIds.some((id) => usedDays.has(id))
    if (overlaps) continue

    const startParts = candidate.dayStart.split('-').map(Number)
    const endParts = candidate.dayEnd.split('-').map(Number)
    const spanDays =
      Math.round(
        (new Date(endParts[0], endParts[1] - 1, endParts[2]) -
          new Date(startParts[0], startParts[1] - 1, startParts[2])) /
          86_400_000,
      ) + 1
    if (spanDays < MIN_DAYS_SPAN) continue

    candidate.receiptIds.forEach((id) => usedDays.add(id))
    picked.push(candidate)
  }

  // Title each chapter from season + dominant category only.
  const markers = picked
    .sort((a, b) => a.dayStart.localeCompare(b.dayStart))
    .map((c, index) => {
      const [y, m] = c.dayStart.split('-').map(Number)
      const monthLabel = formatMonthYear(new Date(y, m - 1, 1))
      return {
        id: `chapter-${index + 1}`,
        title: `${seasonFor(m - 1)} ${monthLabel}`,
        subtitle: `A dense run of ${c.count} moments`,
        dayStart: c.dayStart,
        dayEnd: c.dayEnd,
        count: c.count,
        dominantType: c.dominantType,
        receiptIds: c.receiptIds,
      }
    })

  cache = Object.freeze(markers)
  return cache
}

/** The chapter a given day key falls inside, if any. */
export function chapterForDay(dayKeyString) {
  return (
    getChapterMarkers().find(
      (c) => dayKeyString >= c.dayStart && dayKeyString <= c.dayEnd,
    ) ?? null
  )
}