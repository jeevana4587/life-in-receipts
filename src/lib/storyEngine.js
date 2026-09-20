import {
  receiptById,
  receipts,
  receiptsByDay,
  receiptsByLocation,
  locationKey,
} from './receipts.js'
import { dayKey, humanizeGapMinutes, minutesBetween } from './format.js'

/**
 * Story Engine — connection and clustering logic.
 *
 * Implemented entirely as pure, UI-independent functions (PRD §13.2). Nothing
 * here imports React or touches the DOM, so the rules can be read and tested
 * in isolation.
 *
 * Connection rules, evaluated in priority order (PRD §8.2):
 *   1. Explicit link      — receipts referencing each other via relatedIds
 *                            (the shipped dataset carries none, so this stays
 *                            a supported-but-dormant bonus path).
 *   2. Time proximity     — timestamps within CONNECTION_WINDOW_MINUTES.
 *   3. Same calendar day  — weaker signal, surfaced as a day summary rather
 *                            than a tight moment cluster.
 *   4. Location match     — receipts sharing the same normalised location.
 *
 * The engine is deliberately built to work from time- and location-based
 * inference alone; the prepared dataset does not carry explicit relatedIds.
 */

export const CONNECTION_WINDOW_MINUTES = 120
export const CLUSTER_GAP_MINUTES = 90
export const MAX_CONNECTIONS = 18
export const MAX_CLUSTER = 24
export const MAX_DAY_COMPANIONS = 12

/** Reason descriptors. Lower `priority` wins when a pair connects twice. */
export const REASON_TYPES = {
  explicit: { type: 'explicit', label: 'Linked record', priority: 0 },
  time: { type: 'time', label: 'Close in time', priority: 1 },
  location: { type: 'location', label: 'Same place', priority: 2 },
  day: { type: 'day', label: 'Same day', priority: 3 },
}

/* ------------------------------------------------------------------ *
 * Pre-computed timeline index (built once at module load).
 * ------------------------------------------------------------------ */

const positions = new Map(receipts.map((r, i) => [r.id, i]))

const timeline = receipts.map((r) => ({
  id: r.id,
  time: new Date(r.timestamp).getTime(),
  day: dayKey(r.timestamp),
  loc: locationKey(r),
}))

function makeTimeReason(minutes) {
  return {
    ...REASON_TYPES.time,
    detail: humanizeGapMinutes(minutes),
    minutes,
  }
}

function makeLocationReason(location) {
  return {
    ...REASON_TYPES.location,
    detail: location,
  }
}

function makeExplicitReason() {
  return { ...REASON_TYPES.explicit, detail: 'Linked in the dataset' }
}

function makeDayReason(day) {
  return { ...REASON_TYPES.day, detail: day }
}

function addReason(bucket, id, reason) {
  const list = bucket.get(id) ?? []
  // de-duplicate reasons of the same type, keeping the first (strongest)
  if (!list.some((r) => r.type === reason.type)) list.push(reason)
  bucket.set(id, list)
}

/** Pick the strongest reason from a list (lowest priority number wins). */
function primaryReason(reasons) {
  return [...reasons].sort((a, b) => a.priority - b.priority)[0]
}

/* ------------------------------------------------------------------ *
 * Connections
 * ------------------------------------------------------------------ */

const connectionCache = new Map()

/**
 * All receipts meaningfully connected to `receipt`, each annotated with the
 * reason(s) the connection exists. Results are capped and ordered strongest
 * first so the UI never has to sort.
 *
 * @param {object} receipt
 * @param {{ limit?: number, windowMinutes?: number }} [options]
 * @returns {Array<{ id, receipt, reasons, primary, minutes }>}
 */
export function getConnections(receipt, options = {}) {
  if (!receipt) return []
  const { limit = MAX_CONNECTIONS, windowMinutes = CONNECTION_WINDOW_MINUTES } =
    options
  const cacheKey = `${receipt.id}::${limit}::${windowMinutes}`
  if (connectionCache.has(cacheKey)) return connectionCache.get(cacheKey)

  const bucket = new Map()
  const pos = positions.get(receipt.id)
  const t = new Date(receipt.timestamp).getTime()

  // 1. Explicit links (bonus path; absent in the shipped dataset).
  for (const otherId of receipt.relatedIds ?? []) {
    if (otherId !== receipt.id && receiptById.has(otherId)) {
      addReason(bucket, otherId, makeExplicitReason())
    }
  }

  // 2. Time proximity — walk outward through the sorted timeline.
  if (pos != null) {
    for (let i = pos - 1; i >= 0; i -= 1) {
      const dt = (t - timeline[i].time) / 60_000
      if (dt > windowMinutes) break
      addReason(bucket, timeline[i].id, makeTimeReason(dt))
    }
    for (let i = pos + 1; i < timeline.length; i += 1) {
      const dt = (timeline[i].time - t) / 60_000
      if (dt > windowMinutes) break
      addReason(bucket, timeline[i].id, makeTimeReason(dt))
    }
  }

  // 3. Location match — same normalised place, any date.
  if (receipt.location) {
    const key = locationKey(receipt)
    for (const otherId of receiptsByLocation[key] ?? []) {
      if (otherId !== receipt.id) {
        addReason(bucket, otherId, makeLocationReason(receipt.location))
      }
    }
  }

  // 4. Same calendar day — weakest, attributed last.
  const day = dayKey(receipt.timestamp)
  for (const otherId of receiptsByDay[day] ?? []) {
    if (otherId !== receipt.id) addReason(bucket, otherId, makeDayReason(day))
  }

  const result = [...bucket.entries()]
    .map(([id, reasons]) => {
      const other = receiptById.get(id)
      const primary = primaryReason(reasons)
      return {
        id,
        receipt: other,
        reasons,
        primary,
        minutes: primary.type === 'time' ? primary.minutes : null,
      }
    })
    .filter((c) => c.receipt)
    .sort((a, b) => {
      if (a.primary.priority !== b.primary.priority) {
        return a.primary.priority - b.primary.priority
      }
      if (a.minutes != null && b.minutes != null) return a.minutes - b.minutes
      return new Date(a.receipt.timestamp) - new Date(b.receipt.timestamp)
    })
    .slice(0, limit)

  connectionCache.set(cacheKey, result)
  return result
}

/** Only the tight, time-proximity connections (falls back to all if none). */
export function getTightConnections(receipt, options = {}) {
  const all = getConnections(receipt, options)
  const tight = all.filter((c) => c.primary.type === 'time')
  return tight.length ? tight : all
}

/** Same-day receipts other than the given one, for the day summary. */
export function getDayCompanions(receipt, limit = MAX_DAY_COMPANIONS) {
  if (!receipt) return []
  const day = dayKey(receipt.timestamp)
  const ids = (receiptsByDay[day] ?? []).filter((id) => id !== receipt.id)
  return ids
    .map((id) => receiptById.get(id))
    .filter(Boolean)
    .slice(0, limit)
}

/* ------------------------------------------------------------------ *
 * Clustering (bursts)
 * ------------------------------------------------------------------ */

const clusterCache = new Map()

/**
 * The time-burst `receipt` belongs to: the maximal run of chronologically
 * consecutive receipts where each neighbouring gap is <= CLUSTER_GAP_MINUTES.
 * This is what the Story / Chapter view narrates.
 */
export function getCluster(receipt, max = MAX_CLUSTER) {
  if (!receipt) return []
  const cacheKey = `${receipt.id}::${max}`
  if (clusterCache.has(cacheKey)) return clusterCache.get(cacheKey)

  const pos = positions.get(receipt.id)
  if (pos == null) return [receipt]

  let start = pos
  let end = pos
  while (start > 0) {
    const gap = (timeline[start].time - timeline[start - 1].time) / 60_000
    if (gap > CLUSTER_GAP_MINUTES) break
    start -= 1
  }
  while (end < timeline.length - 1) {
    const gap = (timeline[end + 1].time - timeline[end].time) / 60_000
    if (gap > CLUSTER_GAP_MINUTES) break
    end += 1
  }

  // Trim symmetrically around the focus receipt if the burst is oversized,
  // so a single focus never disappears from its own chapter.
  let ids = timeline.slice(start, end + 1).map((entry) => entry.id)
  if (ids.length > max) {
    const focusIndex = pos - start
    const half = Math.floor(max / 2)
    let lo = focusIndex - half
    lo = Math.max(0, Math.min(lo, ids.length - max))
    ids = ids.slice(lo, lo + max)
  }

  const cluster = ids.map((id) => receiptById.get(id)).filter(Boolean)
  clusterCache.set(cacheKey, cluster)
  return cluster
}

/** Milliseconds span of a cluster (last - first). */
export function clusterSpanMinutes(cluster) {
  if (!cluster || cluster.length < 2) return 0
  const sorted = [...cluster].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )
  return minutesBetween(
    sorted[0].timestamp,
    sorted[sorted.length - 1].timestamp,
  )
}