import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, TrendingUp } from 'lucide-react'
import {
  computeInsights,
  insightSummaries,
  partOfDayDistribution,
  weekdayDistribution,
} from '../lib/insights'
import { getCategoryMeta } from '../lib/categories'
import { formatCount, formatPercent } from '../lib/format'
import { getReceipts, receiptsByLocation } from '../lib/receipts'
import ReceiptCard from '../components/ReceiptCard'
import SectionHeading from '../components/SectionHeading'

/**
 * Insights (PRD §9.6).
 *
 * Deterministic patterns computed from the whole dataset — peak activity
 * window, most-featured category, most-repeated place, categories that
 * co-occur on the same days. Every figure is a calculation, never a model
 * output, and every sentence is hedged ("may suggest").
 *
 * The chart-heavy sections are rendered as plain, accessible markup rather
 * than relying on colour alone — bar lengths carry the magnitude, labels
 * carry the meaning.
 */
export default function Insights() {
  const data = useMemo(() => computeInsights(), [])
  const summaries = useMemo(() => insightSummaries(), [])
  const parts = useMemo(() => partOfDayDistribution(), [])
  const weekdays = useMemo(() => weekdayDistribution(), [])

  const topLocationReceipts = useMemo(() => {
    if (!data.topLocation) return []
    const key = data.topLocation.location.toLowerCase()
    return getReceipts(receiptsByLocation[key] ?? []).slice(0, 3)
  }, [data.topLocation])

  const maxCategoryCount = data.categoryRanking[0]?.count ?? 1
  const maxMonthCount = data.busiestMonth?.count ?? 1

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SectionHeading
        eyebrow="The Reflection Room"
        title="What this year looks like, from a distance"
        description={`Step back from the individual receipts and the shape of a year appears: ${formatCount(
          data.total,
        )} moments across ${formatCount(
          data.activeDays,
        )} active days — roughly ${data.avgPerDay.toFixed(
          1,
        )} for every day you showed up. Everything below is computed from the archive itself, offered as reflection rather than verdict.`}
      />

      {/* Headline insight cards */}
      <section aria-labelledby="headline-insights">
        <h2 id="headline-insights" className="sr-only">
          Headline insights
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <li
              key={s.key}
              className="relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">
                {s.title}
              </p>
              <p className="mt-3 text-2xl font-bold leading-snug tracking-tight text-[var(--color-ink)]">
                {s.value}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                {s.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Category distribution */}
      <section aria-labelledby="category-distribution">
        <SectionHeading
          eyebrow="Breadth"
          title="How the archive breaks down"
          description="Which categories fill the year, ranked by number of moments."
          level={2}
        />
        <h2 id="category-distribution" className="sr-only">
          Category distribution
        </h2>

        <ul className="mt-6 flex flex-col gap-3">
          {data.categoryRanking.map((c) => {
            const { accent, text, Icon } = getCategoryMeta(c.type)
            const fraction = c.count / maxCategoryCount
            return (
              <li key={c.type} className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                  style={{
                    borderColor: `${accent}55`,
                    backgroundColor: `${accent}1a`,
                    color: text,
                  }}
                  aria-hidden="true"
                >
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span className="w-28 shrink-0 truncate text-sm text-[var(--color-ink)] sm:w-40">
                  {c.label}
                </span>
                <span
                  className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(4, fraction * 100)}%`,
                      backgroundColor: accent,
                    }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-soft)]">
                  {formatCount(c.count)} ·{' '}
                  {formatPercent(c.count / data.total)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Time-of-day + weekday */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="time-of-day"
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="time-of-day"
            className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]"
          >
            <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
            When moments happen
          </h2>
          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">
            Calculated from local timestamps. Peak window:{' '}
            <span className="font-medium text-[var(--color-ink)]">
              {data.peakPart}
            </span>
            .
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-[var(--color-ink-soft)]">
                  {p.label}
                </span>
                <span
                  className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(2, p.fraction * 100)}%`,
                      backgroundColor: '#8b5cf6',
                    }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-soft)]">
                  {formatPercent(p.fraction)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="by-weekday"
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="by-weekday"
            className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]"
          >
            <TrendingUp size={16} strokeWidth={1.75} aria-hidden="true" />
            By day of week
          </h2>
          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">
            Relative volume per weekday. Busiest:{' '}
            <span className="font-medium text-[var(--color-ink)]">
              {weekdays.reduce((a, b) => (b.count > a.count ? b : a)).label}
            </span>
            .
          </p>

          {/* Simple column chart — heights carry the magnitude. */}
          <div className="mt-5 flex h-32 items-end gap-2" aria-hidden="true">
            {weekdays.map((w) => (
              <div
                key={w.label}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, w.fraction * 100)}%`,
                    backgroundColor: '#8b5cf6',
                    opacity: 0.85,
                  }}
                />
                <span className="text-[10px] text-[var(--color-ink-soft)]">
                  {w.short}
                </span>
              </div>
            ))}
          </div>

          {/* Accessible tabular equivalent of the chart above. */}
          <table className="sr-only">
            <caption>Moments by weekday</caption>
            <tbody>
              {weekdays.map((w) => (
                <tr key={w.label}>
                  <th scope="row">{w.label}</th>
                  <td>{w.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Location + monthly */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="top-locations"
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="top-locations"
            className="flex items-center gap-2 text-base font-semibold text-[var(--color-ink)]"
          >
            <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
            Most-repeated places
          </h2>
          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">
            Ranked by how many recorded moments name each place. These are
            placeholders in the source data, mapped consistently to fictional
            names.
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {data.locationRanking.slice(0, 8).map((loc) => {
              const fraction = loc.count / (data.locationRanking[0]?.count ?? 1)
              return (
                <li key={loc.location} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-[var(--color-ink)] sm:w-40">
                    {loc.location}
                  </span>
                  <span
                    className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(4, fraction * 100)}%`,
                        backgroundColor: '#34d399',
                      }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-soft)]">
                    {loc.count}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          aria-labelledby="monthly"
          className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <h2
            id="monthly"
            className="text-base font-semibold text-[var(--color-ink)]"
          >
            Moment density by month
          </h2>
          <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">
            The busiest month is{' '}
            <span className="font-medium text-[var(--color-ink)]">
              {data.busiestMonth?.label}
            </span>
            . Density is a direct count, not a normalised rate.
          </p>

          <div className="mt-5 flex h-32 items-end gap-2" aria-hidden="true">
            {data.monthly.map((m) => (
              <div
                key={m.day}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${m.label}: ${m.count}`}
              >
                <span
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (m.count / maxMonthCount) * 100)}%`,
                    backgroundColor: '#8b5cf6',
                    opacity: 0.85,
                  }}
                />
                <span className="text-[10px] text-[var(--color-ink-soft)]">
                  {m.label.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>

          <table className="sr-only">
            <caption>Moments by month</caption>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.day}>
                  <th scope="row">{m.label}</th>
                  <td>{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Co-occurrence */}
      <section aria-labelledby="co-occurrence">
        <SectionHeading
          eyebrow="Co-occurrence"
          title="Categories that appear together"
          description="Pairs of categories that show up on the same calendar day. This is a co-occurrence count, not evidence of causation."
          level={2}
        />
        <h2 id="co-occurrence" className="sr-only">
          Category co-occurrence
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.coOccurrence.map((c) => {
            const a = getCategoryMeta(c.a)
            const b = getCategoryMeta(c.b)
            return (
              <li
                key={`${c.a}-${c.b}`}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md border"
                    style={{
                      borderColor: `${a.accent}55`,
                      backgroundColor: `${a.accent}1a`,
                      color: a.text,
                    }}
                    aria-hidden="true"
                  >
                    <a.Icon size={12} strokeWidth={1.75} />
                  </span>
                  <span className="text-[var(--color-ink-soft)]" aria-hidden="true">
                    +
                  </span>
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md border"
                    style={{
                      borderColor: `${b.accent}55`,
                      backgroundColor: `${b.accent}1a`,
                      color: b.text,
                    }}
                    aria-hidden="true"
                  >
                    <b.Icon size={12} strokeWidth={1.75} />
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
                  {c.labelA} & {c.labelB}
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                  Same day {c.count} time{c.count === 1 ? '' : 's'} — this pairing
                  may reflect a shared routine rather than a direct link.
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Anchor invitations */}
      {topLocationReceipts.length > 0 && (
        <section aria-labelledby="anchor">
          <SectionHeading
            eyebrow="Follow the pattern"
            title={`Moments at ${data.topLocation.location}`}
            description="Open one of the archive's most-repeated places and follow its connections."
            level={2}
            actions={
              <Link
                to="/explore"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#c4b5fd] hover:underline"
              >
                Explore all
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            }
          />
          <h2 id="anchor" className="sr-only">
            Moments at the top location
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {topLocationReceipts.map((r) => (
              <ReceiptCard key={r.id} receipt={r} to={`/moment/${r.id}`} />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
        Every value on this page is computed at build time from the static
        dataset. No runtime model, no external service — the patterns are as
        literal as the data allows, and deliberately stop short of claiming
        anything the receipts do not show.
      </p>
    </div>
  )
}