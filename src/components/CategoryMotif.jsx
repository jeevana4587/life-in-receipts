/**
 * Decorative category motif.
 *
 * A purely visual SVG watermark driven by the `motif` key on a category theme.
 * Always aria-hidden — the category is conveyed by its icon and label, never
 * by the motif or colour alone (PRD §12).
 */

const COMMON = {
  fill: 'none',
  strokeWidth: 1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Waveform() {
  return (
    <g {...COMMON}>
      <path d="M2 24h6M12 14v20M20 8v32M28 18v12M36 4v40M44 16v16M52 22h8" />
    </g>
  )
}

function Film() {
  return (
    <g {...COMMON}>
      <rect x="2" y="8" width="60" height="32" rx="4" />
      <path d="M14 8v32M50 8v32M2 18h12M2 30h12M50 18h12M50 30h12" />
    </g>
  )
}

function MapGrid() {
  return (
    <g {...COMMON}>
      <path d="M2 16l16-6 14 6 14-6 14 6v30l-14 6-14-6-14 6-16-6z" />
      <path d="M18 10v36M32 16v36M46 10v36" />
    </g>
  )
}

function Receipt() {
  return (
    <g {...COMMON}>
      <path d="M8 4h48v52l-6-4-6 4-6-4-6 4-6-4-6 4-6-4z" />
      <path d="M18 18h28M18 28h28M18 38h18" />
    </g>
  )
}

function Frame() {
  return (
    <g {...COMMON}>
      <rect x="6" y="10" width="52" height="40" rx="4" />
      <circle cx="32" cy="30" r="9" />
      <path d="M6 20h10M48 20h10" />
    </g>
  )
}

function Chat() {
  return (
    <g {...COMMON}>
      <path d="M6 8h44a4 4 0 014 4v22a4 4 0 01-4 4H24l-14 12V38H6a4 4 0 01-4-4V12a4 4 0 014-4z" />
      <path d="M14 18h28M14 26h18" />
    </g>
  )
}

function SearchPattern() {
  return (
    <g {...COMMON}>
      <circle cx="26" cy="26" r="16" />
      <path d="M38 38l16 16" />
    </g>
  )
}

function Event() {
  return (
    <g {...COMMON}>
      <path d="M8 18a6 6 0 016-6h36a6 6 0 016 6v4a6 6 0 000 12v4a6 6 0 01-6 6H14a6 6 0 01-6-6v-4a6 6 0 000-12z" />
      <path d="M24 12v40" />
    </g>
  )
}

function Notebook() {
  return (
    <g {...COMMON}>
      <path d="M12 6h40a4 4 0 014 4v44a4 4 0 01-4 4H12z" />
      <path d="M12 6a4 4 0 00-4 4v44a4 4 0 004 4M22 18h22M22 28h22M22 38h14" />
    </g>
  )
}

const MOTIFS = {
  waveform: Waveform,
  film: Film,
  map: MapGrid,
  receipt: Receipt,
  frame: Frame,
  chat: Chat,
  search: SearchPattern,
  event: Event,
  notebook: Notebook,
}

export default function CategoryMotif({ motif, color, className = '' }) {
  const Shape = MOTIFS[motif]
  if (!Shape) return null
  return (
    <svg
      viewBox="0 0 64 64"
      stroke={color}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Shape />
    </svg>
  )
}