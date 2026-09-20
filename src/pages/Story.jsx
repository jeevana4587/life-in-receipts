import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Quote } from 'lucide-react'
import { getReceipt } from '../lib/receipts'
import { getCategoryMeta } from '../lib/categories'
import { getCluster } from '../lib/storyEngine'
import { buildChapter } from '../lib/narrative'
import {
  formatDateRange,
  formatLongDate,
  formatTime,
} from '../lib/format'
import ReceiptCard from '../components/ReceiptCard'
import CategoryMotif from '../components/CategoryMotif'
import SectionHeading from '../components/SectionHeading'
import EmptyState from '../components/EmptyState'

/**
 * Story / Chapter (PRD §9.5, FR4).
 *
 * Synthesises the time-burst a moment belongs to into a short, readable
 * narrative. Every sentence uses hedged language ("may suggest", "appears to")
 * and is derived only from facts present in the cluster — the closing line
 * states explicitly that this is an interpretation, not a claim about the
 * person (Pillar 4).
 */
export default function Story() {
  const { id } = useParams()
  const navigate = useNavigate()
  const receipt = useMemo(() => getReceipt(id), [id])
  const cluster = useMemo(
    () => (receipt ? getCluster(receipt) : []),
    [receipt],
  )

  const chapter = useMemo(() => {
    if (!receipt) return null
    // Seed the chapter from the focused moment so the narrative is stable
    // for a given id, even when other receipts share the same cluster.
    const sorted = [...cluster].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    )
    return buildChapter(sorted)
  }, [receipt, cluster])

  if (!receipt || !chapter) {
    return (
      <EmptyState
        title="Chapter not available"
        description="This moment could not be found, so no chapter can be assembled from it."
      />
    )
  }

  const accent = getCategoryMeta(receipt.type).accent
  const clusterSorted = [...cluster].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
        Back
      </button>

      {/* Chapter header */}
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
          }}
        />
        <CategoryMotif
          motif={getCategoryMeta(receipt.type).motif}
          color={accent}
          className="pointer-events-none absolute -right-10 -bottom-12 h-56 w-56 opacity-50"
        />

        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#c4b5fd]">
            <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" />
            {chapter.kicker}
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {chapter.title}
          </h1>
          <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
            {formatDateRange(chapter.first.timestamp, chapter.last.timestamp)} ·{' '}
            {chapter.count} {chapter.count === 1 ? 'moment' : 'moments'} ·{' '}
            {chapter.spanLabel}
          </p>

          {/* Facts strip */}
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-4">
            {chapter.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--color-ink)]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Narrative body */}
      <section aria-labelledby="chapter-narrative">
        <SectionHeading
          eyebrow="Interpretation"
          title="What this cluster may suggest"
          description="Written from recorded signals only — time, place, and category. Offered as possibilities, not conclusions."
          level={2}
        />
        <h2 id="chapter-narrative" className="sr-only">
          Chapter narrative
        </h2>

        <div className="mt-6 space-y-5 rounded-xl border-l-2 bg-[var(--color-surface)]/60 py-6 pl-6 pr-6">
          <Quote
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            style={{ color: accent }}
          />
          {chapter.paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-[15px] leading-[1.75] text-[var(--color-ink)]/90"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* The moments in this chapter */}
      <section aria-labelledby="chapter-moments">
        <SectionHeading
          eyebrow={`${chapter.count} ${
            chapter.count === 1 ? 'moment' : 'moments'
          }`}
          title="The moments behind this reading"
          description="Every moment the narrative was built from, in the order they occurred."
          level={2}
        />
        <h2 id="chapter-moments" className="sr-only">
          Moments in this chapter
        </h2>

        <ol className="mt-6 flex flex-col gap-3">
          {clusterSorted.map((moment) => (
            <li key={moment.id} className="relative flex gap-4">
              <div className="flex flex-col items-center pt-4">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getCategoryMeta(moment.type).accent }}
                  aria-hidden="true"
                />
                <span
                  className="mt-1 w-px flex-1 bg-[var(--color-line)]"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <span className="mb-1 block text-xs tabular-nums text-[var(--color-ink-soft)]">
                  {formatLongDate(moment.timestamp)} · {formatTime(moment.timestamp)}
                </span>
                <ReceiptCard
                  receipt={moment}
                  to={`/moment/${moment.id}`}
                  variant="compact"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
        This chapter is assembled by grouping moments that occur within a short
        window of one another. It is a reading of the archive, not a record of
        intent — different grouping rules would produce different chapters.
        {' '}
        <Link to="/journey" className="text-[#c4b5fd] hover:underline">
          Return to the Journey
        </Link>
        .
      </p>
    </div>
  )
}