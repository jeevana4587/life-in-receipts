import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, GitBranch } from 'lucide-react'
import { buildTimeline, receiptsForDay } from '../lib/timeline'
import { getCategoryMeta } from '../lib/categories'
import { buildChapter } from '../lib/narrative'
import { getCluster } from '../lib/storyEngine'
import { getChapterMarkers } from '../lib/chapters'
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
  const chapters = useMemo(() => getChapterMarkers(), [])
  const [selected, setSelected] = useState(null)
  const railRef = useRef(null)
  const cellRefs = useRef(new Map())

  const selectedDay = selected
    ? timeline.days.find((d) => d.key === selected)
    : null

  // "Temporal ambiance": the selected day's dominant category tints the
  // page's ambient backdrop, so late-night music days glow purple while
  // daytime place/activity days warm up. Purely atmospheric — a single
  // absolutely-positioned glow layer behind the content.
  const ambiance = selectedDay
    ? getCategoryMeta(selectedDay.dominantType).accent
    : '#8b5cf6'

  return (
    <div className="relative flex flex-col gap-8 sm:gap-10">
      {/* Ambient glow layer — shifts with the selected day's dominant category */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 transition-colors duration-700"
        style={{
          background: `radial-gradient(60% 40% at 50% 0%, ${ambiance}14, transparent 70%)`,
        }}
      />

      <SectionHeading
        eyebrow="The year, in order"
        title="Journey"
        description={
          <>
            A single continuous thread runs through all{' '}
            {timeline.totalDays} active days. Brighter cells hold more
            recorded moments; the colour shows which category dominates.
            Chapter cards mark the dense runs. Select a day to walk it.
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

      {/* Timeline — horizontal rail on desktop, stacked on mobile. The
          glowing spine runs behind the month cards as the "memory thread". */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px sm:block"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(139,92,246,0.5) 12%, rgba(139,92,246,0.5) 88%, transparent)',
            boxShadow: '0 0 12px rgba(139,92,246,0.45)',
          }}
        />
        <div
          ref={railRef}
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
              cellRefs={cellRefs}
            />
          ))}
        </div>
      </div>

      {/* Chapter markers — milestone signposts between the raw days */}
      {chapters.length > 0 && (
        <section aria-labelledby="chapters-heading">
          <h2
            id="chapters-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]"
          >
            Chapter markers
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(chapter.dayStart)
                    cellRefs.current
                      .get(chapter.dayStart)
                      ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center',
                      })
                  }}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left transition-colors duration-200 hover:border-[#8b5cf6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                    {chapter.dayStart} → {chapter.dayEnd}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--color-ink)]">
                    {chapter.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                    {chapter.subtitle}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

function MonthBlock({ month, maxCount, selected, onSelect, cellRefs }) {
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
            cellRefs={cellRefs}
          />
        ))}
      </div>

    </section>
  )
}

function DayCell({ day, maxCount, isSelected, onSelect, cellRefs }) {
  const { accent } = getCategoryMeta(day.dominantType)
  // Intensity scales between 0.14 and 0.9 of the dominant accent.
  const intensity = 0.14 + 0.76 * (day.count / maxCount)
  const isBusy = day.count >= Math.max(3, maxCount * 0.5)

  return (
    <button
      type="button"
      ref={(el) => {
        if (el) cellRefs.current.set(day.key, el)
        else cellRefs.current.delete(day.key)
      }}
      onClick={() => onSelect(day.key)}
      aria-pressed={isSelected}
      aria-label={`${day.label}, ${day.count} ${
        day.count === 1 ? 'moment' : 'moments'
      }`}
      title={`${day.label} · ${day.count} moments`}
      className="relative flex aspect-square min-h-[36px] min-w-[36px] items-center justify-center rounded-md border text-[10px] font-medium tabular-nums transition-all duration-150 hover:z-10 hover:scale-[1.15] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#c4b5fd]"
      style={{
        borderColor: isSelected ? accent : `${accent}55`,
        backgroundColor: accentAlpha(accent, isSelected ? 0.95 : intensity),
        color: isBusy || isSelected ? '#0b0b0f' : 'var(--color-ink)',
        boxShadow: isSelected
          ? `0 0 0 2px ${accent}, 0 0 18px ${accent}66`
          : 'none',
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