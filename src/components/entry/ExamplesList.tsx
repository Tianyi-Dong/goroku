import type { ExampleSentence } from '../../types/entry'

interface ExamplesListProps {
  examples: ExampleSentence[]
  onChange: (examples: ExampleSentence[]) => void
}

export default function ExamplesList({ examples, onChange }: ExamplesListProps) {
  const update = (index: number, field: keyof ExampleSentence, value: string) => {
    const next = [...examples]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(examples.filter((_, i) => i !== index))
  }

  const add = () => onChange([...examples, { japanese: '', translation: '' }])

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">例文</label>
      {examples.map((ex, i) => (
        <div key={i} className="space-y-1 rounded-md border border-gray-200 p-3">
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400">例文 {i + 1}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-sm text-gray-400 hover:text-red-500"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={ex.japanese}
            onChange={(e) => update(i, 'japanese', e.target.value)}
            placeholder="日本語"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          <input
            type="text"
            value={ex.translation}
            onChange={(e) => update(i, 'translation', e.target.value)}
            placeholder="訳"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
          <input
            type="text"
            value={ex.source ?? ''}
            onChange={(e) => update(i, 'source', e.target.value)}
            placeholder="出典（任意・URLも可）"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-500 focus:border-gray-500 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ＋ 例文を追加
      </button>
    </div>
  )
}
