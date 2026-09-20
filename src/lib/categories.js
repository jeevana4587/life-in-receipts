import {
  Camera,
  Film,
  MapPin,
  MessagesSquare,
  Music,
  NotebookPen,
  ReceiptText,
  Search,
  Ticket,
} from 'lucide-react'

/**
 * Single source of truth for the nine receipt categories.
 *
 * Each category carries its own visual identity (label, accent colour, icon,
 * and a subtle background motif). Every screen and the one reusable
 * ReceiptCard component consume this map, so the visual variety stays
 * intentional without multiplying components.
 *
 * Contrast note: the accent hexes below were adjusted from the original PRD
 * palette where needed so that every `text` value clears WCAG AA (>= 4.5:1)
 * against both the app background (#0b0b0f) and card surface (#15151c).
 * `accent` is used for borders, chips and large/UI text; `text` is the
 * body-safe variant; `tint` is a low-alpha wash for chips and motifs.
 */
export const CATEGORY_META = {
  music: {
    label: 'Music',
    accent: '#22d3ee',
    text: '#7dd3fc',
    tint: 'rgba(34, 211, 238, 0.12)',
    motif: 'waveform',
    Icon: Music,
  },
  movie: {
    label: 'Movies & Entertainment',
    shortLabel: 'Movies',
    accent: '#f472b6',
    text: '#f9a8d4',
    tint: 'rgba(244, 114, 182, 0.12)',
    motif: 'film',
    Icon: Film,
  },
  place: {
    label: 'Places',
    accent: '#34d399',
    text: '#6ee7b7',
    tint: 'rgba(52, 211, 153, 0.12)',
    motif: 'map',
    Icon: MapPin,
  },
  purchase: {
    label: 'Purchases',
    accent: '#fbbf24',
    text: '#fcd34d',
    tint: 'rgba(251, 191, 36, 0.12)',
    motif: 'receipt',
    Icon: ReceiptText,
  },
  photo: {
    label: 'Photos',
    accent: '#f97316',
    text: '#fdba74',
    tint: 'rgba(249, 115, 22, 0.12)',
    motif: 'frame',
    Icon: Camera,
  },
  message: {
    label: 'Messages',
    accent: '#818cf8',
    text: '#a5b4fc',
    tint: 'rgba(129, 140, 248, 0.12)',
    motif: 'chat',
    Icon: MessagesSquare,
  },
  search: {
    label: 'Searches',
    accent: '#38bdf8',
    text: '#7dd3fc',
    tint: 'rgba(56, 189, 248, 0.12)',
    motif: 'search',
    Icon: Search,
  },
  event: {
    label: 'Events',
    accent: '#ef4444',
    text: '#fca5a5',
    tint: 'rgba(239, 68, 68, 0.12)',
    motif: 'event',
    Icon: Ticket,
  },
  note: {
    label: 'Personal Notes',
    shortLabel: 'Notes',
    accent: '#a3a3a3',
    text: '#d4d4d4',
    tint: 'rgba(163, 163, 163, 0.12)',
    motif: 'notebook',
    Icon: NotebookPen,
  },
}

const FALLBACK = {
  label: 'Moment',
  shortLabel: 'Moment',
  accent: '#8b5cf6',
  text: '#c4b5fd',
  tint: 'rgba(139, 92, 246, 0.12)',
  motif: 'default',
  Icon: Music,
}

/** Display order used consistently across the app. */
export const CATEGORY_ORDER = [
  'music',
  'movie',
  'place',
  'purchase',
  'photo',
  'message',
  'search',
  'event',
  'note',
]

/** Look up a category theme, falling back gracefully for unknown types. */
export function getCategoryMeta(type) {
  return CATEGORY_META[type] ?? { ...FALLBACK, label: type || FALLBACK.label }
}

/** Human-readable label for a category key. */
export function getCategoryLabel(type) {
  return getCategoryMeta(type).label
}