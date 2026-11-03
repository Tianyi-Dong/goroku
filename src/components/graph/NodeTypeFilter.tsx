import type { EntryType } from '../../types/entry'
import { entryTypeShortLabels, entryTypeColors } from '../../config/entryTypes'

const entryTypes: EntryType[] = ['vocabulary', 'grammar', 'phrase']

interface NodeTypeFilterProps {
  hiddenTypes: Set<EntryType>
  onToggle: (type: EntryType) => void
}

export default function NodeTypeFilter({ hiddenTypes, onToggle }: NodeTypeFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {entryTypes.map((t) => (
        <label key={t} className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!hiddenTypes.has(t)}
            onChange={() => onToggle(t)}
            className="accent-gray-900"
          />
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entryTypeColors[t] }}
          />
          <span className="text-gray-600">{entryTypeShortLabels[t]}</span>
        </label>
      ))}
    </div>
  )
}
