import { getEdgeColor } from './graphStyles'
import { connectionTypeLabel } from '../../config/connectionTypes'

interface GraphFilterProps {
  types: readonly string[]
  hiddenTypes: Set<string>
  onToggle: (type: string) => void
}

export default function GraphFilter({ types, hiddenTypes, onToggle }: GraphFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {types.map((t) => (
        <label key={t} className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!hiddenTypes.has(t)}
            onChange={() => onToggle(t)}
            className="accent-gray-900"
          />
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: getEdgeColor(t) }}
          />
          <span className="text-gray-600">{connectionTypeLabel(t)}</span>
        </label>
      ))}
    </div>
  )
}
