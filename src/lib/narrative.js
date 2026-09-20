import { getCategoryLabel } from './categories'
import {
  clusterSpanMinutes,
  getConnections,
} from './storyEngine'
import {
  formatDateRange,
  formatLongDate,
  formatTime,
  humanizeGapMinutes,
  partOfDay,
} from './format'

/**
 * Narrative synthesis — turns a cluster of receipts into a short, readable
 * "chapter" using strictly hedged language (PRD Pillar 4). Every sentence is
 * derived from facts present in the cluster; nothing is asserted about the
 * person. Pure functions, no React.
 */

/** Distinct category keys present in a cluster, ordered by frequency. */
export function categoryBreakdown(cluster) {
  const counts = {}
  for (const r of cluster) counts[r.type] = (counts[r.type] || 0) + 1
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, label: getCategoryLabel(type) }))
    .sort((a, b) => b.count - a.count)
}

/** Distinct locations present in a cluster. */
export function locationBreakdown(cluster) {
  const set = new Set()
  for (const r of cluster) if (r.location) set.add(r.location)
  return [...set]
}

function listPhrase(items) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

/**
 * Build a structured chapter for a cluster.
 *
 * @returns {{
 *   title: string,
 *   kicker: string,
 *   paragraphs: string[],
 *   spanLabel: string,
 *   categories: Array,
 *   locations: string[],
 *   facts: Array<{ label: string, value: string }>,
 * }}
 */
export function buildChapter(cluster) {
  const sorted = [...cluster].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )
  const count = sorted.length
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const categories = categoryBreakdown(sorted)
  const locations = locationBreakdown(sorted)
  const span = clusterSpanMinutes(sorted)
  const spanLabel = span > 0 ? humanizeGapMinutes(span) : 'a single moment'

  const catLabels = categories.map((c) => c.label)
  const sameDay =
    new Date(first.timestamp).toDateString() ===
    new Date(last.timestamp).toDateString()

  const kicker = sameDay ? formatLongDate(first.timestamp) : 'Earlier this year'

  const title =
    count === 1
      ? first.title
      : `${catLabels[0]} ${count > 2 ? 'and more' : 'moment'}`.trim()

  const paragraphs = []

  // Opening — what the cluster contains.
  if (count === 1) {
    paragraphs.push(
      `This chapter holds a single recorded moment: ${first.title}${
        first.location ? ` at ${first.location}` : ''
      }. On its own it is a fragment, but it is the seed the rest of this cluster is measured against.`,
    )
  } else {
    paragraphs.push(
      `Across ${count} moments spanning ${spanLabel}, this cluster brings together ${listPhrase(
        catLabels.slice(0, 4),
      )}. ${sameDay ? `They fall on ${formatLongDate(first.timestamp)}` : `They run from ${formatDateRange(first.timestamp, last.timestamp)}`}, which may suggest a period of sustained activity rather than isolated events.`,
    )
  }

  // Time-of-day observation.
  if (count > 1) {
    paragraphs.push(
      `The recorded moments begin around ${formatTime(first.timestamp)} and end near ${formatTime(last.timestamp)}, placing most of this activity in the ${partOfDay(first.timestamp).toLowerCase()}. This appears to be a consistent window rather than a scattered pattern.`,
    )
  }

  // Location observation.
  if (locations.length === 1) {
    paragraphs.push(
      `Every located moment here shares the same place: ${locations[0]}. That repetition may indicate this is a routine point of return, though the data alone cannot confirm why.`,
    )
  } else if (locations.length > 1) {
    paragraphs.push(
      `The cluster moves through ${listPhrase(locations.slice(0, 4))}. Taken together, these appear to trace a short route rather than unrelated stops.`,
    )
  }

  // Category observation.
  if (categories.length > 1) {
    const c = categories[0]
    paragraphs.push(
      `${c.label} is the most represented thread here with ${c.count} of ${count} moments, which may suggest it anchors this part of the period.`,
    )
  }

  paragraphs.push(
    'This reading is an interpretation of the recorded signals only. The archive shows what was logged, not what it meant to the person — correlations of time and place are offered as possibilities, not conclusions.',
  )

  // Facts shown alongside the narrative.
  const facts = [
    { label: 'Moments', value: String(count) },
    { label: 'Span', value: spanLabel },
    { label: 'Categories', value: String(categories.length) },
    {
      label: 'Days',
      value: sameDay ? formatLongDate(first.timestamp) : formatDateRange(first.timestamp, last.timestamp),
    },
  ]
  if (locations.length) {
    facts.push({ label: 'Places', value: locations.slice(0, 3).join(', ') })
  }

  return {
    title,
    kicker,
    paragraphs,
    spanLabel,
    categories,
    locations,
    facts,
    first,
    last,
    count,
  }
}

/**
 * A short label describing why a receipt connects to the focused one.
 */
export function connectionLabel(connection) {
  if (!connection) return ''
  const { primary } = connection
  switch (primary.type) {
    case 'time':
      return primary.detail
    case 'location':
      return `Same place · ${primary.detail}`
    case 'day':
      return 'Same day'
    case 'explicit':
      return 'Linked record'
    default:
      return primary.label
  }
}

/**
 * Suggested chapter entry point for a receipt: the strongest available
 * connection or the receipt itself when isolated.
 */
export function chapterSeed(receipt) {
  if (!receipt) return null
  const connections = getConnections(receipt, { limit: 1 })
  return connections[0]?.receipt ?? receipt
}