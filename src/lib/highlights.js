import { getConnections } from './storyEngine'
import { computeInsights } from './insights'
import { dayKey } from './format'

/**
 * Highlight selection — picks receipts that are genuinely worth starting
 * from. Pure function over the dataset; used by the Landing screen to seed
 * exploration rather than dump the list.
 *
 * Strategy:
 *   - one "anchor" moment from each of the top categories, so the seed row
 *     shows the breadth of the archive,
 *   - preferred from busy days, so a click immediately leads to a real
 *     cluster of connected moments,
 *   - de-duplicated and capped.
 */
export function getHighlightMoments(list, limit = 6) {
  const insights = computeInsights()
  const busyDays = new Set(insights.mostActiveDays.map((d) => d.day))
  const topTypes = insights.categoryRanking.map((c) => c.type)

  const byType = new Map()
  for (const r of list) {
    const bucket = byType.get(r.type) ?? []
    bucket.push(r)
    byType.set(r.type, bucket)
  }

  const picks = []
  const used = new Set()

  // Pass 1: strongest candidate per top category, preferring busy days and
  // receipts that actually have connections.
  for (const type of topTypes) {
    const candidates = (byType.get(type) ?? [])
      .slice()
      .sort((a, b) => score(b, busyDays) - score(a, busyDays))
    const chosen = candidates.find((r) => !used.has(r.id))
    if (chosen) {
      picks.push(chosen)
      used.add(chosen.id)
    }
    if (picks.length >= limit) break
  }

  // Pass 2: top up from the overall busiest receipts if still short.
  if (picks.length < limit) {
    const fallback = list
      .slice()
      .sort((a, b) => score(b, busyDays) - score(a, busyDays))
    for (const r of fallback) {
      if (used.has(r.id)) continue
      picks.push(r)
      used.add(r.id)
      if (picks.length >= limit) break
    }
  }

  return picks.slice(0, limit)
}

/** Higher is more interesting: busy days and connectable moments win. */
function score(receipt, busyDays) {
  let s = 0
  if (busyDays.has(dayKey(receipt.timestamp))) s += 3
  const connections = getConnections(receipt, { limit: 3 })
  s += Math.min(connections.length, 3)
  if (receipt.location) s += 1
  return s
}