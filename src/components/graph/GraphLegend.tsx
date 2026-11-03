import { getEdgeColor } from './graphStyles'
import { connectionTypeLabel } from '../../config/connectionTypes'
import { entryTypeShortLabels, entryTypeColors } from '../../config/entryTypes'
import type { EntryType } from '../../types/entry'

const entryTypes: EntryType[] = ['vocabulary', 'grammar', 'phrase']

interface GraphLegendProps {
  types: readonly string[]
}

export default function GraphLegend({ types }: GraphLegendProps) {
  return (
    <div className="absolute bottom-3 left-3 rounded-md border border-gray-200 bg-white/90 px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-gray-500">ノード</p>
      <div className="mb-2 flex flex-col gap-1">
        {entryTypes.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entryTypeColors[t] }}
            />
            <span className="text-xs text-gray-600">{entryTypeShortLabels[t]}</span>
          </div>
        ))}
      </div>
      <p className="mb-1 text-xs font-medium text-gray-500">つながり</p>
      <div className="flex flex-col gap-1">
        {types.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: getEdgeColor(t) }}
            />
            <span className="text-xs text-gray-600">{connectionTypeLabel(t)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
