import { useState } from 'react'
import type { Entry, EntryType } from '../../types/entry'
import { getAllEntries } from '../../db/queries/entries'
import { createConnection, connectionExists } from '../../db/queries/connections'
import { connectionTypes, connectionTypeLabel } from '../../config/connectionTypes'
import { entryTypeShortLabels } from '../../config/entryTypes'

interface ManualConnectionFormProps {
  entry: Entry
  onDone: () => void
}

const entryTypeOrder: EntryType[] = ['vocabulary', 'grammar', 'phrase']

export default function ManualConnectionForm({ entry, onDone }: ManualConnectionFormProps) {
  const [targetId, setTargetId] = useState('')
  const [type, setType] = useState('')
  const [userLabel, setUserLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const candidates = getAllEntries().filter((e) => e.id !== entry.id)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!targetId || !type) return

    if (type === 'OTHER' && !userLabel.trim()) {
      setError('「その他」タイプにはラベルが必要です')
      return
    }

    if (connectionExists(entry.id, targetId, type)) {
      setError('このつながりはすでに存在します')
      return
    }

    createConnection({
      sourceId: entry.id,
      targetId,
      type,
      userLabel: type === 'OTHER' ? userLabel.trim() : null,
      confirmedByUser: true,
    })

    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-gray-200 p-3">
      <h4 className="text-sm font-semibold text-gray-700">手動でつながりを追加</h4>

      <div>
        <label className="text-xs text-gray-500">対象</label>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">選択してください</option>
          {entryTypeOrder.map((et) => {
            const group = candidates.filter((c) => c.type === et)
            if (group.length === 0) return null
            return (
              <optgroup key={et} label={entryTypeShortLabels[et]}>
                {group.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.term}{c.reading ? ` (${c.reading})` : ''} — {c.meanings[0]}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">タイプ</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">選択してください</option>
          {connectionTypes.map((t) => (
            <option key={t} value={t}>
              {connectionTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {type === 'OTHER' && (
        <div>
          <label className="text-xs text-gray-500">ラベル *</label>
          <input
            type="text"
            value={userLabel}
            onChange={(e) => setUserLabel(e.target.value)}
            placeholder="関係の説明"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!targetId || !type}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-40"
        >
          追加
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
