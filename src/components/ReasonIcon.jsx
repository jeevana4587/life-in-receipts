import { CalendarDays, Clock, Link2, MapPin } from 'lucide-react'

/**
 * Icon for a Story Engine connection reason. Keeps connection iconography in
 * one place and pairs it with the visible text label so meaning is never
 * carried by the icon or colour alone (PRD §12).
 */
const ICONS = {
  explicit: Link2,
  time: Clock,
  location: MapPin,
  day: CalendarDays,
}

export default function ReasonIcon({ type, size = 12, className = '' }) {
  const Icon = ICONS[type] ?? Link2
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      className={className}
    />
  )
}