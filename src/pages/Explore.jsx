import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { locations, presentTypes, totalReceipts } from '../lib/receipts'
import { getCategoryMeta } from '../lib/categories'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterReceipts,
  hasActiveFilters,
} from '../lib/filters'
import { formatCount } from '../lib/format'
import ReceiptCard from '../components/ReceiptCard'
import SectionHeading from '../components/SectionHeading'
import EmptyState from '../components/EmptyState'

/**
 * Explore (PRD §9.3, FR1 + FR2).
 *
 * Search and filter access to the full receipt set. Filters combine with AND
 * logic and always show an empty state when nothing matches. Initial type
 * comes from the URL (?type=music) so links from Landing deep-link correctly.
 *
 * Desktop: persistent filter rail beside the grid.
 * Tablet/mobile: filters collapse into a drawer triggered by a button.
 */

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
]

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialType = searchParams.get('type')

  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    categories: initialType ? [initialType] : [],
  })
  const [sort, setSort] = useState('newest')
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Keep the URL in sync with the selected single category (deep-linkable).
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (filters.categories.length === 1) {
      next.set('type', filters.categories[0])
    } else {
      next.delete('type')
    }
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.categories])

  const results = useMemo(
    () => filterReceipts(filters, sort),
    [filters, sort],
  )

  const update = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const toggleCategory = useCallback((type) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(type)
        ? prev.categories.filter((t) => t !== type)
        : [...prev.categories, type],
    }))
  }, [])

  const clearAll = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS })
  }, [])

  const activeCount = activeFilterCount(filters)

  const filterPanel = (
    <FilterPanel
      filters={filters}
      update={update}
      toggleCategory={toggleCategory}
      clearAll={clearAll}
      resultCount={results.length}
    />
  )

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <SectionHeading
        eyebrow="Direct lookup"
        title="Explore"
        description={`Search and filter all ${formatCount(totalReceipts)} recorded moments. Filters combine, so narrowing by category and word at the same time works as expected.`}
      />

      {/* Search bar + mobile filter trigger */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search titles, descriptions, places…"
            aria-label="Search moments"
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="explore-sort">
            Sort order
          </label>
          <select
            id="explore-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-medium text-[var(--color-ink)] lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls="explore-filters"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span
                className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: '#8b5cf6' }}
              >
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Desktop filter rail */}
        <aside className="hidden w-[264px] shrink-0 lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <p
            className="mb-4 text-sm text-[var(--color-ink-soft)]"
            role="status"
            aria-live="polite"
          >
            {results.length === 0
              ? 'No moments match your filters.'
              : `Showing ${formatCount(results.length)} of ${formatCount(
                  totalReceipts,
                )} moments`}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="No moments match"
              description="Nothing in the archive fits this combination of filters. Try removing a category or searching for a different word."
              action={
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)]"
                >
                  Clear all filters
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((receipt) => (
                <li key={receipt.id}>
                  <ReceiptCard
                    receipt={receipt}
                    to={`/moment/${receipt.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-[var(--color-line)] p-2 text-[var(--color-ink-soft)]"
                aria-label="Close filters"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {filterPanel}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-5 w-full rounded-lg bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Show {formatCount(results.length)} moments
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */

function FilterPanel({
  filters,
  update,
  toggleCategory,
  clearAll,
  resultCount,
}) {
  return (
    <div
      id="explore-filters"
      className="flex flex-col gap-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Filters
        </h2>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-[#c4b5fd] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories (multi-select) */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
          Category
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {presentTypes.map((type) => {
            const { label, accent, text, Icon } = getCategoryMeta(type)
            const active = filters.categories.includes(type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleCategory(type)}
                aria-pressed={active}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c4b5fd]"
                style={{
                  borderColor: active ? accent : 'var(--color-line)',
                  backgroundColor: active ? `${accent}22` : 'transparent',
                  color: active ? text : 'var(--color-ink-soft)',
                }}
              >
                <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Location */}
      <div>
        <label
          htmlFor="explore-location"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]"
        >
          Location
        </label>
        <select
          id="explore-location"
          value={filters.location}
          onChange={(e) => update({ location: e.target.value })}
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
        >
          <option value="">Any location</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
          Date range
        </legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="explore-from">
            From date
          </label>
          <input
            id="explore-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
          />
          <span className="text-xs text-[var(--color-ink-soft)]" aria-hidden="true">
            to
          </span>
          <label className="sr-only" htmlFor="explore-to">
            To date
          </label>
          <input
            id="explore-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-2.5 py-2 text-xs text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
          />
        </div>
      </fieldset>

      <p className="text-xs text-[var(--color-ink-soft)]" aria-live="polite">
        {formatCount(resultCount)} matching moments
      </p>
    </div>
  )
}