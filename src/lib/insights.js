import { receipts, countByType, receiptsByLocation } from './receipts'
import { getCategoryLabel } from './categories'
import { dayKey, formatMonthYear, partOfDay } from './format'

/**
 * Insights — deterministic aggregates computed from the dataset (PRD §9.6,
 * §13.1). Every value here is a plain calculation over the static data; no
 * external model is involved. Functions are pure and memoised so screens do
 * not recompute on render.
 */

const HOUR_BUCKETS = [
  'Late night',
  'Morning',
  'Afternoon',
  'Evening',
  'Night',
]

let cached = null

/**
 * Compute the full insight set once, then reuse.
 */
export function computeInsights() {
  if (cached) return cached

  const total = receipts.length
  const hours = new Array(24).fill(0)
  const days = new Array(7).fill(0)
  const parts = HOUR_BUCKETS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {})
  const monthCounts = {}
  const dayTotals = {}
  const categoryByDay = {}

  for (const r of receipts) {
    const d = new Date(r.timestamp)
    hours[d.getHours()] += 1
    days[d.getDay()] += 1
    parts[partOfDay(r.timestamp)] += 1

    const mk = dayKey(new Date(d.getFullYear(), d.getMonth(), 1))
    monthCounts[mk] = (monthCounts[mk] || 0) + 1

    const dk = dayKey(r.timestamp)
    dayTotals[dk] = (dayTotals[dk] || 0) + 1
    ;(categoryByDay[dk] ??= new Set()).add(r.type)
  }

  const peakHour = hours.indexOf(Math.max(...hours))
  const peakPart = HOUR_BUCKETS.reduce((best, k) =>
    parts[k] > parts[best] ? k : best,
  )

  const mostActiveDays = Object.entries(dayTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([day, count]) => ({ day, count }))

  // Most-featured category.
  const categoryRanking = Object.entries(countByType)
    .map(([type, count]) => ({ type, count, label: getCategoryLabel(type) }))
    .sort((a, b) => b.count - a.count)

  // Most-visited place (by number of receipts tagged with that location).
  const locationRanking = Object.entries(receiptsByLocation)
    .map(([, ids]) => {
      const sample = receipts.find((r) => r.id === ids[0])
      return { location: sample?.location ?? '', count: ids.length }
    })
    .filter((l) => l.location)
    .sort((a, b) => b.count - a.count)

  // Categories that co-occur on the same days.
  const pairCounts = {}
  for (const types of Object.values(categoryByDay)) {
    const arr = [...types].sort()
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        const key = `${arr[i]}|${arr[j]}`
        pairCounts[key] = (pairCounts[key] || 0) + 1
      }
    }
  }
  const coOccurrence = Object.entries(pairCounts)
    .map(([key, count]) => {
      const [a, b] = key.split('|')
      return {
        a,
        b,
        count,
        labelA: getCategoryLabel(a),
        labelB: getCategoryLabel(b),
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Monthly distribution across the covered period.
  const monthly = Object.entries(monthCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({
      day,
      count,
      label: formatMonthYear(day),
    }))

  // Average moments per active day.
  const activeDays = Object.keys(dayTotals).length
  const avgPerDay = activeDays ? total / activeDays : 0

  cached = {
    total,
    activeDays,
    avgPerDay,
    hours,
    days,
    parts,
    peakHour,
    peakPart,
    mostActiveDays,
    categoryRanking,
    locationRanking,
    topLocation: locationRanking[0] ?? null,
    coOccurrence,
    monthly,
    busiestMonth: monthly.reduce(
      (best, m) => (m.count > (best?.count ?? -1) ? m : best),
      null,
    ),
  }
  return cached
}

/** Number of distinct calendar days that contain at least one receipt. */
export function activeDayCount() {
  return computeInsights().activeDays
}

/**
 * One-sentence, hedged takeaway for a single insight card. Language stays
 * aggregate and tentative on purpose (PRD Pillar 4): "appears to", "may
 * suggest" — never an assertion about the person's life.
 */
export function insightSummaries() {
  const i = computeInsights()
  const summaries = []

  if (i.peakPart) {
    const pct = i.total ? i.parts[i.peakPart] / i.total : 0
    summaries.push({
      key: 'peak-time',
      title: 'Peak activity window',
      value: i.peakPart,
      detail: `${Math.round(pct * 100)}% of moments appear to fall in the ${i.peakPart.toLowerCase()} — the busiest part of the day in this dataset.`,
    })
  }

  if (i.categoryRanking[0]) {
    const top = i.categoryRanking[0]
    summaries.push({
      key: 'top-category',
      title: 'Most-featured category',
      value: top.label,
      detail: `${top.label} accounts for ${top.count} of ${i.total} recorded moments, making it the most represented thread.`,
    })
  }

  if (i.topLocation) {
    summaries.push({
      key: 'top-location',
      title: 'Most-repeated place',
      value: i.topLocation.location,
      detail: `${i.topLocation.location} recurs in ${i.topLocation.count} moments, which may suggest it is a routine point in this period.`,
    })
  }

  if (i.busiestMonth) {
    summaries.push({
      key: 'busiest-month',
      title: 'Busiest month',
      value: i.busiestMonth.label,
      detail: `${i.busiestMonth.label} holds ${i.busiestMonth.count} moments — the densest month captured here.`,
    })
  }

  if (i.coOccurrence[0]) {
    const c = i.coOccurrence[0]
    summaries.push({
      key: 'co-occurrence',
      title: 'Categories that travel together',
      value: `${c.labelA} + ${c.labelB}`,
      detail: `${c.labelA} and ${c.labelB} appear on the same day ${c.count} times, which appears to be the strongest recurring pairing.`,
    })
  }

  return summaries
}

/** Compact distribution of receipts by part of day, for a mini chart. */
export function partOfDayDistribution() {
  const i = computeInsights()
  const total = i.total || 1
  return HOUR_BUCKETS.map((label) => ({
    label,
    count: i.parts[label],
    fraction: i.parts[label] / total,
  }))
}

/** Weekday distribution, Monday-first. */
export function weekdayDistribution() {
  const i = computeInsights()
  const names = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const max = Math.max(...i.days, 1)
  return i.days.map((count, idx) => ({
    label: names[idx],
    short: names[idx].slice(0, 3),
    count,
    fraction: count / max,
  }))
}
