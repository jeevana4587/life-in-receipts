import rawReceipts from '../data/life-receipts.json' with { type: 'json' }
import { CATEGORY_ORDER } from './categories.js'
import { dayKey } from './format.js'
import { sanitizeReceipts, VALID_TYPES } from './sanitize.js'

/**
 * Normalised, read-only view over the static life-receipts dataset.
 *
 * Every record is passed through the sanitisation boundary first, so the rest
 * of the app only ever sees validated, de-duplicated, chronologically sorted
 * receipts. All derived structures are computed a single time at module load,
 * so screens never re-sort or re-index the full 1.6k-record set on render.
 *
 * The JSON is imported once at build time (no fetching, no backend).
 */

/** The full, validated, chronologically sorted receipt list (frozen). */
export const receipts = sanitizeReceipts(rawReceipts)

/** Fast id -> receipt lookup. */
export const receiptById = new Map(receipts.map((r) => [r.id, r]))

/** ids grouped by category type. */
export const receiptIdsByType = receipts.reduce((acc, r) => {
  ;(acc[r.type] ??= []).push(r.id)
  return acc
}, {})

/** Counts per category, ordered per CATEGORY_ORDER then any extras. */
export const countByType = receipts.reduce((acc, r) => {
  acc[r.type] = (acc[r.type] || 0) + 1
  return acc
}, {})

/** Category keys present in the dataset, in canonical order. */
export const presentTypes = [
  ...CATEGORY_ORDER.filter((t) => countByType[t]),
  ...Object.keys(countByType).filter((t) => !CATEGORY_ORDER.includes(t)),
]

/**
 * Receipts that carry a usable `location`, grouped by the normalised
 * location key so location-based connections can be resolved in O(1).
 */
function normalizeLocation(loc) {
  return String(loc ?? '')
    .trim()
    .toLowerCase()
}

export const receiptsByLocation = receipts.reduce((acc, r) => {
  if (!r.location) return acc
  const key = normalizeLocation(r.location)
  ;(acc[key] ??= []).push(r.id)
  return acc
}, {})

/** Receipts grouped by local calendar day, keyed YYYY-MM-DD. */
export const receiptsByDay = receipts.reduce((acc, r) => {
  const key = dayKey(r.timestamp)
  ;(acc[key] ??= []).push(r.id)
  return acc
}, {})

/** Distinct location display names, sorted, for filters. */
export const locations = [
  ...new Set(receipts.filter((r) => r.location).map((r) => r.location)),
].sort((a, b) => a.localeCompare(b))

/** The covered time span, derived from the data. */
export const dateRange = {
  first: receipts[0]?.timestamp ?? null,
  last: receipts[receipts.length - 1]?.timestamp ?? null,
}

/** Total number of receipts in the dataset. */
export const totalReceipts = receipts.length

/**
 * A small integrity report: how many raw records were present versus how many
 * survived validation. Useful for observability — and proof that the
 * sanitisation boundary is actually applied.
 */
export const dataIntegrity = Object.freeze({
  rawCount: Array.isArray(rawReceipts) ? rawReceipts.length : 0,
  validCount: receipts.length,
  rejected: Array.isArray(rawReceipts)
    ? Math.max(0, rawReceipts.length - receipts.length)
    : 0,
  validTypes: VALID_TYPES,
})

/** Convenience lookup by id. */
export function getReceipt(id) {
  return receiptById.get(id) ?? null
}

/** Resolve a list of ids to receipts, dropping any that are missing. */
export function getReceipts(ids) {
  return ids.map((id) => receiptById.get(id)).filter(Boolean)
}

/** Normalised location key, exported for the Story Engine. */
export function locationKey(receipt) {
  return normalizeLocation(receipt?.location)
}