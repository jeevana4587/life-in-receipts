/**
 * Data sanitisation and validation boundary.
 *
 * The dataset is static, but treating it as untrusted at the point of entry is
 * defence in depth (Security & Data Sanitisation): any malformed, oversized,
 * duplicated, or type-invalid record is rejected or normalised here, so the
 * rest of the app can assume clean, well-formed receipts.
 *
 * Everything in this module is a pure function with no browser dependencies.
 */

/** The nine valid receipt categories. */
export const VALID_TYPES = Object.freeze([
  'music',
  'movie',
  'place',
  'purchase',
  'photo',
  'message',
  'search',
  'event',
  'note',
])

/** Upper bounds keep a single hostile record from bloating the DOM. */
const LIMITS = Object.freeze({
  id: 120,
  title: 200,
  description: 1000,
  location: 160,
  searchQuery: 120,
})

// eslint-disable-next-line no-control-regex -- control chars are exactly what we strip
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g

/** True for a plain object (not null, not an array). */
export function isPlainObject(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

/**
 * Normalise a string for safe display:
 *  - must be a string (anything else -> '')
 *  - strip control / invisible characters
 *  - collapse runs of whitespace
 *  - trim
 *  - enforce a maximum length
 *
 * Note: React escapes text on render, so this is not a substitute for output
 * encoding — it is input hygiene (length and control-char limits).
 */
export function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/** Clamp a free-text search query to a sane length. */
export function sanitizeSearchQuery(value) {
  return sanitizeText(value, LIMITS.searchQuery)
}

/** Validate and normalise an ISO timestamp. Returns ISO string or null. */
export function sanitizeTimestamp(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Keep only scalar, finite metadata values; drop nested/functions/etc. */
export function sanitizeMetadata(value) {
  if (!isPlainObject(value)) return undefined
  const out = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== 'string' || key.length > 60) continue
    if (typeof raw === 'string') {
      out[key] = sanitizeText(raw, 200)
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw
    } else if (typeof raw === 'boolean') {
      out[key] = raw
    }
    // anything else (objects, arrays, functions) is intentionally dropped
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * Validate a single raw record. Returns a normalised receipt, or null if the
 * record cannot be made safe/valid. Never throws.
 */
export function validateReceipt(raw) {
  if (!isPlainObject(raw)) return null

  const id = sanitizeText(raw.id, LIMITS.id)
  if (!id) return null

  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!VALID_TYPES.includes(type)) return null

  const timestamp = sanitizeTimestamp(raw.timestamp)
  if (!timestamp) return null

  const title = sanitizeText(raw.title, LIMITS.title) || 'Untitled moment'
  const description =
    sanitizeText(raw.description, LIMITS.description) ||
    'No description recorded for this moment.'

  const location = raw.location
    ? sanitizeText(raw.location, LIMITS.location) || undefined
    : undefined

  const receipt = {
    id,
    type,
    title,
    timestamp,
    description,
  }
  if (location) receipt.location = location

  const metadata = sanitizeMetadata(raw.metadata)
  if (metadata) receipt.metadata = metadata

  const relatedIds = Array.isArray(raw.relatedIds)
    ? raw.relatedIds
        .map((v) => sanitizeText(v, LIMITS.id))
        .filter((v) => v && v !== id)
        .slice(0, 50)
    : undefined
  if (relatedIds && relatedIds.length) receipt.relatedIds = relatedIds

  return receipt
}

/**
 * Sanitise an entire dataset:
 *  - drop records that fail validation
 *  - de-duplicate by id (first wins)
 *  - sort chronologically
 *
 * Returns a frozen array so downstream modules cannot mutate the shared data.
 */
export function sanitizeReceipts(rawList) {
  if (!Array.isArray(rawList)) return Object.freeze([])

  const seen = new Set()
  const clean = []

  for (const raw of rawList) {
    const receipt = validateReceipt(raw)
    if (!receipt) continue
    if (seen.has(receipt.id)) continue
    seen.add(receipt.id)
    clean.push(receipt)
  }

  clean.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return Object.freeze(clean)
}

export { LIMITS }