import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Footprints,
  Link2,
  MapPin,
  Share2,
  X,
} from 'lucide-react'
import { getReceipt } from '../lib/receipts'
import { getCategoryMeta } from '../lib/categories'
import { getConnections, getDayCompanions, getCluster } from '../lib/storyEngine'
import { buildChapter, connectionLabel } from '../lib/narrative'
import {
  formatDateTime,
  formatLongDate,
  formatDateRange,
} from '../lib/format'
import ReceiptCard from '../components/ReceiptCard'
import CategoryChip from '../components/CategoryChip'
import CategoryMotif from '../components/CategoryMotif'
import SectionHeading from '../components/SectionHeading'
import EmptyState from '../components/EmptyState'

/**
 * Moment Detail (PRD §9.4, FR3 + FR4).
 *
 * One receipt in full, with its category-specific visual theme, followed by
 * its "Connected Moments" cluster. Every connection shows the basis it was
 * derived from — same day, close in time, same place — so the relationship is
 * explained rather than opaque. From here the user can open the Story/Chapter
 * view for the surrounding cluster.
 */
export default function MomentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const receipt = useMemo(() => getReceipt(id), [id])

  const connections = useMemo(
    () => (receipt ? getConnections(receipt) : []),
    [receipt],
  )
  const dayCompanions = useMemo(
    () => (receipt ? getDayCompanions(receipt) : []),
    [receipt],
  )
  const cluster = useMemo(
    () => (receipt ? getCluster(receipt) : []),
    [receipt],
  )
  const chapter = useMemo(
    () => (cluster.length ? buildChapter(cluster) : null),
    [cluster],
  )

  // "Walk This Outing": guided stepping through the cluster. The rest of
  // the interface dims while the walk is active, so only the trail is lit.
  const [walking, setWalking] = useState(false)
  const [walkIndex, setWalkIndex] = useState(0)
  const walkSorted = useMemo(
    () =>
      [...cluster].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      ),
    [cluster],
  )
  const walkCurrent = walking ? walkSorted[walkIndex] : null

  const startWalk = useCallback(() => {
    setWalkIndex(Math.max(0, walkSorted.findIndex((r) => r.id === receipt.id)))
    setWalking(true)
  }, [walkSorted, receipt.id])

  const stopWalk = useCallback(() => setWalking(false), [])

  const stepWalk = useCallback(
    (delta) => {
      setWalkIndex((i) =>
        Math.min(walkSorted.length - 1, Math.max(0, i + delta)),
      )
    },
    [walkSorted.length],
  )

  // Keyboard: arrows step through the walk, Escape exits it.
  useEffect(() => {
    if (!walking) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') stopWalk()
      if (e.key === 'ArrowRight') stepWalk(1)
      if (e.key === 'ArrowLeft') stepWalk(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [walking, stopWalk, stepWalk])

  // Escape returns to the previous screen — but only when the walk overlay
  // is not open (the walk owns Escape while active).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !walking) navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, walking])

  if (!receipt) {
    return (
      <EmptyState
        title="Moment not found"
        description="This receipt id is not in the archive. It may have been removed or mistyped."
        action={
          <Link
            to="/explore"
            className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] hover:border-[#8b5cf6]"
          >
            Back to Explore
          </Link>
        }
      />
    )
  }

  const { accent, text } = getCategoryMeta(receipt.type)
  const tight = connections.filter((c) => c.primary.type === 'time')

  return (
    <div
      className={`relative flex flex-col gap-8 transition-opacity duration-300 sm:gap-10 ${
        walking ? 'opacity-30' : 'opacity-100'
      }`}
      aria-hidden={walking ? 'true' : undefined}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
        Back
      </button>

      {/* Focus card */}
      <article className="relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-6 sm:p-8">
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
          className="pointer-events-none absolute -right-8 -bottom-10 h-48 w-48 opacity-60 sm:h-60 sm:w-60"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip type={receipt.type} size="md" />
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
              <CalendarDays size={13} strokeWidth={1.75} aria-hidden="true" />
              {formatDateTime(receipt.timestamp)}
            </span>
            {receipt.location && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
                <MapPin size={13} strokeWidth={1.75} aria-hidden="true" />
                {receipt.location}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            {receipt.title}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-ink)]/90">
            {receipt.description}
          </p>

          {/* Metadata */}
          <MetadataTable receipt={receipt} accent={text} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {chapter && (
              <Link
                to={`/story/${receipt.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
              >
                <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                Read this chapter
              </Link>
            )}
            {cluster.length > 1 && (
              <button
                type="button"
                onClick={startWalk}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                style={{
                  borderColor: 'rgba(52,211,153,0.6)',
                  backgroundColor: 'rgba(52,211,153,0.12)',
                  color: '#6ee7b7',
                }}
              >
                <Footprints size={16} strokeWidth={1.75} aria-hidden="true" />
                Walk This Outing
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: receipt.title,
                      text: receipt.description,
                      url: window.location.href,
                    })
                    .catch(() => {})
                } else {
                  navigator.clipboard?.writeText(window.location.href)
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)]"
            >
              <Share2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Share this moment
            </button>
          </div>
        </div>
      </article>

      {/* Connected moments */}
      <section aria-labelledby="connections-heading">
        <SectionHeading
          eyebrow={`${connections.length} ${
            connections.length === 1 ? 'connection' : 'connections'
          }`}
          title="Connected Moments"
          description="Other receipts the Story Engine links to this one. Each card states the basis for the link — time, place, or calendar day — so nothing is inferred silently."
          level={2}
        />
        <h2 id="connections-heading" className="sr-only">
          Connected moments
        </h2>

        {connections.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No strong connections"
              description="No other receipt falls within the connection windows for this moment. It stands alone in the archive."
              icon={Link2}
            />
          </div>
        ) : (
          <>
            {tight.length > 0 && (
              <p className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
                <Link2 size={13} strokeWidth={1.75} aria-hidden="true" />
                Within about two hours
              </p>
            )}
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {connections.map((connection) => (
                <li key={connection.id}>
                  <ReceiptCard
                    receipt={connection.receipt}
                    to={`/moment/${connection.id}`}
                    reason={connectionLabel(connection)}
                    reasonType={connection.primary.type}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Same-day summary */}
      {dayCompanions.length > 0 && (
        <section aria-labelledby="day-heading">
          <SectionHeading
            eyebrow={formatLongDate(receipt.timestamp)}
            title="Elsewhere on this day"
            description="A looser grouping: receipts that share the calendar day but not necessarily a tight time window. Use it as context, not a cluster."
            level={2}
          />
          <h2 id="day-heading" className="sr-only">
            Same-day moments
          </h2>

          <ul className="mt-6 flex flex-wrap gap-2">
            {dayCompanions.map((companion) => (
              <li key={companion.id}>
                <Link
                  to={`/moment/${companion.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6]"
                >
                  <CategoryChip type={companion.type} showLabel={false} />
                  <span className="max-w-[220px] truncate">
                    {companion.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {cluster.length > 1 && (
            <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
              This moment sits in a cluster of {cluster.length} spanning{' '}
              {formatDateRange(cluster[0].timestamp, cluster[cluster.length - 1].timestamp)}.
            </p>
          )}
        </section>
      )}

      {/* "Walk This Outing" overlay — a guided, dimmed stepping view */}
      {walking && walkCurrent && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Walking this outing"
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-[var(--color-surface)] p-6 shadow-2xl"
            style={{ borderColor: 'rgba(52,211,153,0.5)' }}
          >
            <div className="flex items-center justify-between">
              <p
                className="font-mono text-[10px] uppercase tracking-[0.25em]"
                style={{ color: '#6ee7b7' }}
              >
                Walk This Outing · step {walkIndex + 1} of{' '}
                {walkSorted.length}
              </p>
              <button
                type="button"
                onClick={stopWalk}
                aria-label="Exit the walk"
                className="rounded-lg border border-[var(--color-line)] p-2 text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4">
              <CategoryChip type={walkCurrent.type} size="md" />
              <h2 className="mt-3 text-xl font-bold text-[var(--color-ink)]">
                {walkCurrent.title}
              </h2>
              <p className="mt-2 font-mono text-xs text-[var(--color-ink-soft)]">
                {formatDateTime(walkCurrent.timestamp)}
                {walkCurrent.location ? ` · ${walkCurrent.location}` : ''}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/90">
                {walkCurrent.description}
              </p>
            </div>

            {/* Progress dots along the trail */}
            <ol
              className="mt-5 flex items-center gap-1.5"
              aria-label="Walk progress"
            >
              {walkSorted.map((step, i) => (
                <li
                  key={step.id}
                  aria-current={i === walkIndex ? 'step' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setWalkIndex(i)}
                    aria-label={`Step ${i + 1}: ${step.title}`}
                    className="h-2.5 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                    style={{
                      width: i === walkIndex ? 22 : 10,
                      backgroundColor:
                        i === walkIndex
                          ? '#34d399'
                          : i < walkIndex
                            ? 'rgba(52,211,153,0.45)'
                            : 'var(--color-line)',
                    }}
                  />
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => stepWalk(-1)}
                disabled={walkIndex === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#34d399] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
              >
                <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                Earlier
              </button>

              {walkIndex < walkSorted.length - 1 ? (
                <button
                  type="button"
                  onClick={() => stepWalk(1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#34d399] px-4 py-2 text-sm font-semibold text-[#06281e] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                >
                  Next moment
                  <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : (
                <Link
                  to={`/story/${walkCurrent.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
                >
                  <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
                  Read the full chapter
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- */

function MetadataTable({ receipt, accent }) {
  const m = receipt.metadata ?? {}
  const rows = []
  if (m.amount != null) rows.push(['Amount', m.amount])
  if (m.category) rows.push(['Category', m.category])
  if (m.subcategory) rows.push(['Subcategory', m.subcategory])
  if (m.trackCount != null) rows.push(['Tracks', m.trackCount])
  if (m.durationMinutes != null)
    rows.push(['Duration', `${m.durationMinutes} min`])
  if (m.dominantArtist) rows.push(['Artist', m.dominantArtist])
  if (m.skips != null) rows.push(['Skips', m.skips])
  if (m.rating) rows.push(['Rating', m.rating])
  if (m.ticketType) rows.push(['Ticket', m.ticketType])
  if (m.platform) rows.push(['Platform', m.platform])
  if (m.device) rows.push(['Device', m.device])
  if (m.engine) rows.push(['Engine', m.engine])
  if (m.app) rows.push(['App', m.app])

  if (!rows.length) return null

  return (
    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--color-line)] pt-5 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-medium" style={{ color: accent }}>
            {String(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}