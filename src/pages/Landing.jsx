import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { ArrowRight, GitBranch, Search, Sparkles } from 'lucide-react'
import {
  countByType,
  dateRange,
  presentTypes,
  receipts,
  totalReceipts,
} from '../lib/receipts'
import { getCategoryMeta } from '../lib/categories'
import { activeDayCount, insightSummaries } from '../lib/insights'
import { formatDate, formatCount } from '../lib/format'
import CategoryMotif from '../components/CategoryMotif'
import ReceiptCard from '../components/ReceiptCard'
import SectionHeading from '../components/SectionHeading'
import { getHighlightMoments } from '../lib/highlights'

/**
 * Landing / Overview (PRD §9.1).
 *
 * Orients rather than enumerates: headline counts, a category breakdown, one
 * clear entry point into the Journey, and a few seed moments to start
 * exploring from. No raw data dump.
 */
export default function Landing() {
  const days = useMemo(() => activeDayCount(), [])
  const seeds = useMemo(() => getHighlightMoments(receipts, 6), [])
  const teasers = useMemo(() => insightSummaries().slice(0, 3), [])

  const topCategories = presentTypes
    .map((type) => ({ type, count: countByType[type] }))
    .sort((a, b) => b.count - a.count)

  const periodLabel = dateRange.first
    ? `${formatDate(dateRange.first).replace(
        / \d{4}$/,
        '',
      )} – ${formatDate(dateRange.last)}`
    : '—'

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-12 sm:px-10 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'rgba(139,92,246,0.35)' }}
        />

        <div className="relative max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
            A digital life story
          </p>
          <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            Your Life, In Receipts
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-[17px]">
            {formatCount(totalReceipts)} recorded moments from a single year,
            spanning {presentTypes.length} kinds of digital trace. Not a list —
            a story you can walk through, one connected moment at a time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/journey"
              className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
            >
              <GitBranch size={16} strokeWidth={2} aria-hidden="true" />
              Walk the Journey
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors duration-150 hover:border-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)]"
            >
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              Explore all moments
            </Link>
          </div>
        </div>

        {/* Stat row */}
        <dl className="relative mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[var(--color-line)] pt-8 sm:grid-cols-4">
          <Stat label="Moments" value={formatCount(totalReceipts)} />
          <Stat label="Categories" value={String(presentTypes.length)} />
          <Stat label="Active days" value={formatCount(days)} />
          <Stat label="Covered period" value={periodLabel} />
        </dl>
      </section>

      {/* Category breakdown */}
      <section aria-labelledby="overview-categories">
        <SectionHeading
          eyebrow="What's inside"
          title="Nine kinds of trace"
          description="Each category arrives through the same card component with its own accent, icon, and motif — so the archive reads as one system, not nine screens."
          level={2}
        />
        <h2 id="overview-categories" className="sr-only">
          Category breakdown
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topCategories.map(({ type, count }) => {
            const { label, accent, text, motif, Icon } = getCategoryMeta(type)
            const share = count / totalReceipts
            return (
              <li key={type}>
                <Link
                  to={`/explore?type=${type}`}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${accent}88`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-line)'
                  }}
                >
                  <CategoryMotif
                    motif={motif}
                    color={accent}
                    className="pointer-events-none absolute -right-4 -bottom-5 h-20 w-20 opacity-50"
                  />
                  <span
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      borderColor: `${accent}55`,
                      backgroundColor: `${accent}1a`,
                      color: text,
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
                      {label}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
                      <span className="tabular-nums">
                        {formatCount(count)} moments
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {Math.round(share * 100)}%
                      </span>
                    </span>
                  </span>
                  <ArrowRight
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="relative shrink-0 text-[var(--color-ink-soft)] transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Start exploring */}
      <section aria-labelledby="overview-start">
        <SectionHeading
          eyebrow="Begin"
          title="Start with a single moment"
          description="Every receipt opens onto the moments around it. Pick one and the archive starts explaining its own connections."
          level={2}
          actions={
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c4b5fd] hover:underline"
            >
              See all
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          }
        />
        <h2 id="overview-start" className="sr-only">
          Start exploring
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seeds.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              to={`/moment/${receipt.id}`}
            />
          ))}
        </div>
      </section>

      {/* Insights teaser */}
      <section aria-labelledby="overview-insights">
        <SectionHeading
          eyebrow="Patterns"
          title="What the year suggests"
          description="Aggregate patterns computed straight from the dataset — offered as possibilities, never as conclusions."
          level={2}
          actions={
            <Link
              to="/insights"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c4b5fd] hover:underline"
            >
              All insights
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          }
        />
        <h2 id="overview-insights" className="sr-only">
          Insights preview
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {teasers.map((t) => (
            <li
              key={t.key}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
                {t.title}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {t.value}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-soft)]">
                {t.detail}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Every figure above is a deterministic calculation over the dataset —
          nothing is generated at runtime.
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
        {label}
      </dt>
      <dd className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--color-ink)] sm:text-2xl">
        {value}
      </dd>
    </div>
  )
}