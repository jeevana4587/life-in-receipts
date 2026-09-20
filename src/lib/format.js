/**
 * Small, pure formatting helpers shared across screens.
 * Kept dependency-free so they are trivially testable.
 */

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_ONLY = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const TIME_ONLY = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
})

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "14 Mar 2017, 18:30" */
export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_TIME.format(d)
}

/** "14 Mar 2017" */
export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_ONLY.format(d)
}

/** "18:30" */
export function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return TIME_ONLY.format(d)
}

/** "March 2017" */
export function formatMonthYear(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return MONTH_YEAR.format(d)
}

/** "Tuesday, 14 March 2017" */
export function formatLongDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return LONG_DATE.format(d)
}

/** Stable YYYY-MM-DD key in local time. */
export function dayKey(dateLike) {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Absolute minutes between two ISO timestamps. */
export function minutesBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000
}

/** "35 minutes apart" / "2 hours apart" / "3 days apart". */
export function humanizeGapMinutes(mins) {
  const m = Math.max(0, Math.round(mins))
  if (m < 1) return 'moments apart'
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} apart`
  const hours = Math.round(m / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} apart`
  const days = Math.round(m / 60 / 24)
  return `${days} day${days === 1 ? '' : 's'} apart`
}

/** "12 Oct – 18 Oct 2017", collapsing to a single day when equal. */
export function formatDateRange(startIso, endIso) {
  const a = new Date(startIso)
  const b = new Date(endIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
  if (dayKey(a) === dayKey(b)) return formatDate(a)
  return `${formatDate(a)} – ${formatDate(b)}`
}

/** Compact number, e.g. 1275 -> "1.3k". */
export function formatCount(n) {
  const value = Number(n) || 0
  if (value < 1000) return String(value)
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(value / 1000)}k`
}

/** Percentage helper, e.g. 0.428 -> "43%". */
export function formatPercent(fraction) {
  return `${Math.round((Number(fraction) || 0) * 100)}%`
}

/** Part-of-day bucket for a timestamp, in local time. */
export function partOfDay(dateLike) {
  const h = new Date(dateLike).getHours()
  if (h < 5) return 'Late night'
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  if (h < 21) return 'Evening'
  return 'Night'
}

/** Truncate a string to a max length, adding an ellipsis. */
export function truncate(text, max = 120) {
  const s = String(text ?? '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1).trimEnd()}…`
}

