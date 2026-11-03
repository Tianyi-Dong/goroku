import { connectionTypeLabel } from '../../config/connectionTypes'

const typeColors: Record<string, string> = {
  SAME_KANJI: 'bg-amber-100 text-amber-700',
  RELATED: 'bg-blue-100 text-blue-700',
  CONTRAST: 'bg-red-100 text-red-700',
  REGISTER_PAIRED: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

export default function ConnectionBadge({ type }: { type: string }) {
  const color = typeColors[type] ?? typeColors.OTHER

  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {connectionTypeLabel(type)}
    </span>
  )
}
