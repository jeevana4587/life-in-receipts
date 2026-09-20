import { SearchX } from 'lucide-react'

/**
 * Shared empty state. Used whenever a filter/search combination yields no
 * receipts (FR2) or a section has nothing to show. Communicates the state in
 * text, never by colour alone (PRD §12).
 */
export default function EmptyState({
  title = 'No moments match',
  description = 'Try removing a filter or searching for a different word.',
  icon: Icon = SearchX,
  action = null,
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/60 px-6 py-14 text-center"
    >
      <span
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border"
        style={{
          borderColor: 'rgba(139,92,246,0.4)',
          backgroundColor: 'rgba(139,92,246,0.12)',
          color: '#c4b5fd',
        }}
        aria-hidden="true"
      >
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}