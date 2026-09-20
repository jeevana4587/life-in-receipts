import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { getCategoryMeta } from '../lib/categories'
import { formatDateTime, formatTime, truncate } from '../lib/format'
import CategoryChip from './CategoryChip'
import CategoryMotif from './CategoryMotif'
import ReasonIcon from './ReasonIcon'

/**
 * The single reusable receipt card (PRD §10.6).
 *
 * Every category is rendered through this one component. The `receipt.type`
 * drives the accent colour, icon, and background motif; the `variant` controls
 * density. There are deliberately no per-category card components.
 *
 * Variants:
 *   'default' — grid browsing (Explore) and connection lists.
 *   'compact' — dense lists (day summaries, chapter rosters).
 *   'focus'   — the hero card on the Moment Detail screen.
 *
 * Composition rules honoured here:
 *   - icon + label always accompany the accent colour (PRD §12)
 *   - hover raises the card and highlights the border (PRD §10.7)
 *   - focus-visible ring is never suppressed (PRD §10.8)
 */

/** One-line, type-aware enrichment shown under the description. */
function metaLine(receipt) {
  const m = receipt.metadata ?? {}
  switch (receipt.type) {
    case 'purchase':
      return m.amount != null ? `Amount ${m.amount}` : null
    case 'music':
      return m.trackCount != null
        ? `${m.trackCount} track${m.trackCount === 1 ? '' : 's'}${m.dominantArtist ? ` · ${m.dominantArtist}` : ''}`
        : null
    case 'movie':
      return m.rating ? `Rated ${m.rating}` : null
    case 'event':
      return m.ticketType ? `Ticket · ${m.ticketType}` : null
    case 'message':
      return m.platform ? `via ${m.platform}` : null
    case 'photo':
      return m.device ? `Captured on ${m.device}` : null
    case 'search':
      return m.engine ? `Searched on ${m.engine}` : null
    case 'note':
      return m.app ? `Written in ${m.app}` : null
    case 'place':
      return m.subcategory ? m.subcategory.toUpperCase() : null
    default:
      return null
  }
}

export default function ReceiptCard({
  receipt,
  variant = 'default',
  reason = null,
  reasonType = null,
  descriptionLimit = 110,
  to = null,
  onClick = null,
  className = '',
  style: styleProp,
}) {
  if (!receipt) return null

  const { accent, text, motif, Icon } = getCategoryMeta(receipt.type)
  const compact = variant === 'compact'
  const focus = variant === 'focus'
  const enrichment = metaLine(receipt)

  const padding = compact ? 'p-3' : focus ? 'p-6 sm:p-8' : 'p-4 sm:p-5'
  const radius = focus ? 'rounded-2xl' : 'rounded-xl'

  const inner = (
    <>
      {/* Motif watermark */}
      <CategoryMotif
        motif={motif}
        color={accent}
        className={`pointer-events-none absolute select-none ${
          compact
            ? '-right-4 -bottom-5 h-20 w-20'
            : focus
              ? '-right-6 -bottom-8 h-40 w-40'
              : '-right-5 -bottom-6 h-28 w-28'
        }`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }}
      />

      <div className="relative flex items-start gap-3">
        <span
          className={`flex shrink-0 items-center justify-center border ${
            focus ? 'h-11 w-11 rounded-xl' : 'h-8 w-8 rounded-lg'
          }`}
          style={{
            borderColor: `${accent}55`,
            backgroundColor: `${accent}1a`,
            color: text,
          }}
          aria-hidden="true"
        >
          <Icon size={focus ? 22 : 16} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`min-w-0 font-semibold text-[var(--color-ink)] ${
                focus ? 'text-lg sm:text-xl' : compact ? 'text-sm' : 'text-[15px]'
              }`}
            >
              <span className="line-clamp-2">{receipt.title}</span>
            </h3>
            {(to || onClick) && (
              <ArrowUpRight
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--color-ink-soft)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            )}
          </div>

          {!compact && receipt.description && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              {truncate(receipt.description, focus ? 400 : descriptionLimit)}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <time
              dateTime={receipt.timestamp}
              className="text-xs tabular-nums text-[var(--color-ink-soft)]"
            >
              {focus
                ? formatDateTime(receipt.timestamp)
                : formatTime(receipt.timestamp)}
            </time>
            {enrichment && !compact && (
              <span className="text-xs text-[var(--color-ink-soft)]">
                {enrichment}
              </span>
            )}
          </div>

          {(reason || focus) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CategoryChip type={receipt.type} showLabel={focus} />
              {reason && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium leading-none"
                  style={{
                    borderColor: `${accent}44`,
                    backgroundColor: `${accent}12`,
                    color: text,
                  }}
                >
                  {reasonType && <ReasonIcon type={reasonType} size={11} />}
                  {reason}
                </span>
              )}
            </div>
          )}

          {compact && (
            <div className="mt-2">
              <CategoryChip type={receipt.type} showLabel={false} />
            </div>
          )}
        </div>
      </div>
    </>
  )

  const base = `group relative block overflow-hidden border bg-[var(--color-surface)] text-left transition-all duration-200 ${padding} ${radius} ${className}`
  const style = {
    borderColor: 'var(--color-line)',
    ...styleProp,
  }

  const hoverStyle = {
    borderColor: `${accent}88`,
    boxShadow: `0 12px 32px -18px ${accent}88`,
  }

  const handleMouseEnter = (e) => {
    Object.assign(e.currentTarget.style, hoverStyle)
  }
  const handleMouseLeave = (e) => {
    e.currentTarget.style.borderColor = 'var(--color-line)'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (to) {
    return (
      <Link
        to={to}
        className={base}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={base}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {inner}
      </button>
    )
  }

  return (
    <article className={base} style={style}>
      {inner}
    </article>
  )
}