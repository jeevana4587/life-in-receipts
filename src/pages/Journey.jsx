import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, GitBranch } from 'lucide-react'
import { buildTimeline, receiptsForDay } from '../lib/timeline'
import { getCategoryMeta } from '../lib/categories'
import { buildChapter } from '../lib/narrative'
import { getCluster } from '../lib/storyEngine'
import ReceiptCard from '../components/ReceiptCard'
import CategoryChip from '../components/CategoryChip'
import SectionHeading from '../components/SectionHeading'
import EmptyState from '../components/EmptyState'

/**
 * Journey (PRD §9.2, FR5).
 *
 * An interactive timeline of every moment across the covered period. Days are
 * plotted as heatmap cells whose intensity and accent reflect how many moments
 * land on that day and which category dominates — so moments that cluster in
 * time are visually grouped rather than overlapping. Selecting a day reveals
 * that day's moments and the entry point to its chapter.
 *
 * Desktop: months laid out horizontally with a scrollable rail.
 * Mobile: months stacked vertically.
 */

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Journey() {
  const timeline = useMemo(() => buildTimeline(), [])
  const [selected, setSelected] = useState(null)

  const selectedDay = selected
    ? timeline.days.find((d) => d.key === selected)
    : null

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <SectionHeading
        eyebrow="The year, in order"
        title="Journey"
        description={
          <>
            Every one of {timeline.totalDays} active days, plotted in sequence.
            Brighter, taller days hold more recorded moments; the colour shows
            which category dominates. Select a day to open its moments.
          </>
        }
      />

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
        aria-label="Category legend"
      >
        {legendTypes.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: getCategoryMeta(type).accent }}
              aria-hidden="true"
            />
            <span className="text-xs text-[var(--color-ink-soft)]">
              {getCategoryMeta(type).shortLabel ?? getCategoryMeta(type).label}
            </span>
          </span>
        ))}
      </div>

      {/* Timeline — horizontal rail on desktop, stacked on mobile */}
      <div
        className="flex flex-col gap-6 sm:flex-row sm:gap-5 sm:overflow-x-auto sm:pb-4"
        role="list"
        aria-label="Months of the year"
      >
        {timeline.months.map((month) => (
          <MonthBlock
            key={month.key}
            month={month}
            maxCount={timeline.maxDayCount}
            selected={selected}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Selected day panel */}
      <div className="min-h-[1px]">
        {selectedDay ? (
          <DayPanel
            day={selectedDay}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/50 px-5 py-6 text-center">
            <CalendarDays
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mx-auto mb-2 text-[var(--color-ink-soft)]"
            />
            <p className="text-sm text-[var(--color-ink-soft)]">
              Pick any day above to open the moments recorded on it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- */

/** Category keys shown in the legend, in canonical order. */
const legendTypes = [
  'music',
  'purchase',
  'place',
  'movie',
  'photo',
  'message',
  'search',
  'event',
  'note',
]

function MonthBlock({ month, maxCount, selected, onSelect }) {
  // Leading blank cells so the grid reads like a real calendar week.
  const [y, m] = month.key.split('-').map(Number)
  const leading = new Date(y, m - 1, 1).getDay()

  return (
    <section
      className="shrink-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:w-[248px]"
      aria-label={month.label}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          {month.label}
        </h3>
        <span className="text-xs tabular-nums text-[var(--color-ink-soft)]">
          {month.count}
        </span>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className="pb-1 text-center text-[10px] font-medium uppercase text-[var(--color-ink-soft)]"
            aria-hidden="true"
          >
            {w}
          </span>
        ))}

        {Array.from({ length: leading }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}

        {month.days.map((day) => (
          <DayCell
            key={day.key}
            day={day}
            maxCount={maxCount}
            isSelected={selected === day.key}
            onSelect={onSelect}
          />
        ))}
      </div>

    </section>
  )
}

function DayCell({ day, maxCount, isSelected, onSelect }) {
  const { accent } = getCategoryMeta(day.dominantType)
  // Intensity scales between 0.14 and 0.9 of the dominant accent.
  const intensity = 0.14 + 0.76 * (day.count / maxCount)
  const isBusy = day.count >= Math.max(3, maxCount * 0.5)

  return (
    <button
      type="button"
      onClick={() => onSelect(day.key)}
      aria-pressed={isSelected}
      aria-label={`${day.label}, ${day.count} ${
        day.count === 1 ? 'moment' : 'moments'
      }`}
      title={`${day.label} · ${day.count} moments`}
      className="relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-medium tabular-nums transition-all duration-150 hover:scale-[1.12] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c4b5fd]"
      style={{
        borderColor: isSelected ? accent : `${accent}55`,
        backgroundColor: accentAlpha(accent, isSelected ? 0.95 : intensity),
        color: isBusy || isSelected ? '#0b0b0f' : 'var(--color-ink)',
        boxShadow: isSelected ? `0 0 0 2px ${accent}` : 'none',
      }}
    >
      {day.dayOfMonth}
    </button>
  )
}

/** Convert a hex colour + alpha into an rgba() string. */
function accentAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function DayPanel({ day, onClose }) {
  const receipts = useMemo(() => receiptsForDay(day), [day])
  const chapter = useMemo(() => {
    if (!receipts.length) return null
    const anchor = receipts.find((r) => r.location) ?? receipts[0]
    return buildChapter(getCluster(anchor))
  }, [receipts])

  const typeEntries = Object.entries(day.typeCounts).sort(
    (a, b) => b[1] - a[1],
  )

  return (
    <section
      aria-label={`Moments on ${day.label}`}
      className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c4b5fd]">
            {day.label}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">
            {day.count} {day.count === 1 ? 'moment' : 'moments'} recorded
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {typeEntries.map(([type]) => (
              <CategoryChip key={type} type={type} showLabel />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chapter && (
            <Link
              to={`/story/${receipts[0].id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)]"
            >
              <GitBranch size={15} strokeWidth={1.75} aria-hidden="true" />
              Read this chapter
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
          >
            Close
          </button>
        </div>
      </header>

      {receipts.length ? (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <li key={receipt.id}>
              <ReceiptCard
                receipt={receipt}
                to={`/moment/${receipt.id}`}
                variant="compact"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No moments on this day"
            description="This day has no recorded receipts in the dataset."
          />
        </div>
      )}

      {receipts.length > 0 && (
        <Link
          to={`/moment/${receipts[0].id}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#c4b5fd] hover:underline"
        >
          Open the first moment of the day
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}