import { getCategoryMeta } from '../lib/categories'

/**
 * Small pill that labels a category. The icon + text label always accompany
 * the accent colour so meaning is never carried by colour alone (PRD §12).
 *
 * Sizes: 'sm' (inline within cards), 'md' (filters, headers).
 */
export default function CategoryChip({
  type,
  size = 'sm',
  showLabel = true,
  className = '',
}) {
  const { label, accent, text, Icon } = getCategoryMeta(type)
  const sizing =
    size === 'sm'
      ? 'gap-1.5 px-2 py-1 text-[11px]'
      : 'gap-2 px-2.5 py-1.5 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium leading-none ${sizing} ${className}`}
      style={{
        borderColor: `${accent}55`,
        backgroundColor: `${accent}14`,
        color: text,
      }}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={1.75} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  )
}