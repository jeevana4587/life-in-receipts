import { receipts, receiptById } from './receipts.js'
import { dayKey, formatDate, formatMonthYear } from './format.js'
import { computeInsights } from './insights.js'

/**
 * Timeline construction for the Journey screen (FR5).
 *
 * Groups the full receipt set into calendar days and then months, so the UI
 * can render a legible, cluster-aware timeline at any width without ever
 * plotting two points on top of each other. Pure functions over the dataset.
 */

let cache = null

/**
 * Build the day/month timeline once.
 *
 * @returns {{
 *   months: Array<{
 *     key: string,
 *     label: string,
 *     days: Array<{
 *       key: string,
 *       label: string,
 *       shortLabel: string,
 *       count: number,
 *       receiptIds: string[],
 *       dominantType: string,
 *       typeCounts: Record<string, number>,
 *       hasLocation: boolean,
 *     }>,
 *     count: number,
 *   }>,
 *   maxDayCount: number,
 *   totalDays: number,
 * }}
 */
export function buildTimeline() {
  if (cache) return cache

  const byDay = new Map()

  for (const r of receipts) {
    const key = dayKey(r.timestamp)
    let day = byDay.get(key)
    if (!day) {
      day = {
        key,
        receiptIds: [],
        typeCounts: {},
        hasLocation: false,
      }
      byDay.set(key, day)
    }
    day.receiptIds.push(r.id)
    day.typeCounts[r.type] = (day.typeCounts[r.type] || 0) + 1
    if (r.location) day.hasLocation = true
  }

  // Turn the day map into an ordered array with derived fields.
  const days = [...byDay.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((day) => {
      const dominantType = Object.entries(day.typeCounts).sort(
        (a, b) => b[1] - a[1],
      )[0][0]
      const [y, m, d] = day.key.split('-').map(Number)
      const dateObj = new Date(y, m - 1, d)
      return {
        key: day.key,
        label: formatDate(dateObj),
        shortLabel: String(d),
        dayOfMonth: d,
        count: day.receiptIds.length,
        receiptIds: day.receiptIds,
        dominantType,
        typeCounts: day.typeCounts,
        hasLocation: day.hasLocation,
      }
    })

  // Group days into months, preserving order.
  const monthMap = new Map()
  for (const day of days) {
    const monthKey = day.key.slice(0, 7) // YYYY-MM
    let month = monthMap.get(monthKey)
    if (!month) {
      const [y, m] = monthKey.split('-').map(Number)
      month = {
        key: monthKey,
        label: formatMonthYear(new Date(y, m - 1, 1)),
        days: [],
        count: 0,
      }
      monthMap.set(monthKey, month)
    }
    month.days.push(day)
    month.count += day.count
  }

  const months = [...monthMap.values()]
  const maxDayCount = days.reduce((max, d) => Math.max(max, d.count), 0)

  cache = {
    months,
    days,
    maxDayCount,
    totalDays: days.length,
  }
  return cache
}

/** Resolve a list of receipt ids to receipts (used by day drill-downs). */
export function receiptsForDay(day) {
  return day.receiptIds.map((id) => receiptById.get(id)).filter(Boolean)
}

/**
 * The busiest days, ranked — used to offer "jump to" anchors in the Journey.
 */
export function busiestDays(limit = 5) {
  return computeInsights().mostActiveDays.slice(0, limit).map((d) => {
    const { days } = buildTimeline()
    const day = days.find((x) => x.key === d.day)
    return { ...d, day }
  })
}