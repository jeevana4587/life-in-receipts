/**
 * Section heading with an optional eyebrow and description.
 * Keeps the heading hierarchy consistent (h2 by default) so screens expose a
 * clean h1 -> h2 -> h3 outline (PRD §12).
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  level = 2,
  actions = null,
  className = '',
}) {
  const Heading = `h${level}`
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#c4b5fd]">
            {eyebrow}
          </p>
        )}
        <Heading className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {title}
        </Heading>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}