interface MeaningsListProps {
  meanings: string[]
  onChange: (meanings: string[]) => void
}

export default function MeaningsList({ meanings, onChange }: MeaningsListProps) {
  const update = (index: number, value: string) => {
    const next = [...meanings]
    next[index] = value
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(meanings.filter((_, i) => i !== index))
  }

  const add = () => onChange([...meanings, ''])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">意味 *</label>
      {meanings.map((m, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={m}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`意味 ${i + 1}`}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          {meanings.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ＋ 意味を追加
      </button>
    </div>
  )
}
