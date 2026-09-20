import { receipts } from './receipts'
import { dayKey } from './format'

/**
 * Search and filter logic (FR2). Pure functions over the dataset so the same
 * behaviour can be reused and tested independently of the UI.
 *
 * Filters combine with AND logic:
 *   - categories: multi-select (empty = all)
 *   - query: free-text over title + description (+ location)
 *   - dateFrom / dateTo: inclusive bounds
 *   - location: exact match on the normalised location
 */

export const EMPTY_FILTERS = {
  categories: [],
  query: '',
  dateFrom: '',
  dateTo: '',
  location: '',
}

/** Normalise a query for comparison. */
function norm(s) {
  return String(s ?? '').toLowerCase().trim()
}

/** True when a receipt matches the active filters. */
export function matchesFilters(receipt, filters) {
  const { categories, query, dateFrom, dateTo, location } = filters

  if (categories.length && !categories.includes(receipt.type)) return false

  if (query) {
    const q = norm(query)
    const haystack = norm(
      `${receipt.title} ${receipt.description} ${receipt.location ?? ''}`,
    )
    if (!haystack.includes(q)) return false
  }

  if (dateFrom && dayKey(receipt.timestamp) < dateFrom) return false
  if (dateTo && dayKey(receipt.timestamp) > dateTo) return false

  if (location) {
    if (norm(receipt.location) !== norm(location)) return false
  }

  return true
}

/** Apply a full filter set to a receipt list, preserving order. */
export function applyFilters(list, filters) {
  if (!filters) return list
  return list.filter((r) => matchesFilters(r, filters))
}

/** True when any filter deviates from the empty set. */
export function hasActiveFilters(filters) {
  return (
    filters.categories.length > 0 ||
    Boolean(filters.query) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.location)
  )
}

/** Count of active filter facets, for the mobile filter button badge. */
export function activeFilterCount(filters) {
  let n = filters.categories.length
  if (filters.query) n += 1
  if (filters.dateFrom || filters.dateTo) n += 1
  if (filters.location) n += 1
  return n
}

/** The convenience selector used by Explore: filter + sort the full set. */
export function filterReceipts(filters, sort = 'newest') {
  const filtered = applyFilters(receipts, filters)
  const sorted = [...filtered]
  if (sort === 'oldest') {
    sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  } else if (sort === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  } else {
    sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
  return sorted
}