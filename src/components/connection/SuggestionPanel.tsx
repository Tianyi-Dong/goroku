import { useState, useEffect, useCallback } from 'react'
import type { Entry } from '../../types/entry'
import type { ConnectionSuggestion } from '../../services/connectionSuggestion'
import { generateSuggestions } from '../../services/connectionSuggestion'
import { createConnection } from '../../db/queries/connections'
import ConnectionBadge from './ConnectionBadge'

interface SuggestionPanelProps {
  entry: Entry
  onClose: () => void
  onConnectionsChanged: () => void
}

export default function SuggestionPanel({
  entry,
  onClose,
  onConnectionsChanged,
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [decided, setDecided] = useState<Set<number>>(new Set())
  const [kanjiExpanded, setKanjiExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setAiError(null)

    generateSuggestions(entry)
      .then((result) => {
        if (!cancelled) {
          setSuggestions(result.suggestions)
          setAiError(result.aiError)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError((err as Error).message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [entry])

  const handleConfirm = useCallback(
    (index: number, userLabel?: string) => {
      const s = suggestions[index]
      createConnection({
        sourceId: entry.id,
        targetId: s.targetEntry.id,
        type: s.type,
        userLabel: userLabel?.trim() || null,
        aiReasoning: s.reasoning,
        confirmedByUser: true,
      })
      setDecided((prev) => new Set(prev).add(index))
      onConnectionsChanged()
    },
    [suggestions, entry, onConnectionsChanged],
  )

  const handleDismiss = useCallback((index: number) => {
    setDecided((prev) => new Set(prev).add(index))
  }, [])

  const semanticSuggestions = suggestions.filter((s) => s.type !== 'SAME_KANJI')
  const kanjiSuggestions = suggestions.filter((s) => s.type === 'SAME_KANJI')

  const allDecided = suggestions.every((_, i) => decided.has(i))

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">つながり提案を生成中…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={onClose}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700"
        >
          閉じる
        </button>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">つながり提案はありません</p>
        {aiError && (
          <p className="mt-1 text-xs text-red-500">AI提案の取得に失敗しました: {aiError}</p>
        )}
        <button
          onClick={onClose}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700"
        >
          閉じる
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          つながり提案 ({suggestions.length - decided.size}件)
        </h3>
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          閉じる
        </button>
      </div>

      {aiError && (
        <p className="mb-2 text-xs text-red-500">
          AI提案の取得に失敗しました（同漢字の提案のみ表示しています）: {aiError}
        </p>
      )}

      <div className="space-y-2">
        {semanticSuggestions.map((s) => {
          const globalIndex = suggestions.indexOf(s)
          const isDone = decided.has(globalIndex)
          return (
            <SuggestionItem
              key={globalIndex}
              suggestion={s}
              entryTerm={entry.term}
              decided={isDone}
              onConfirm={(label) => handleConfirm(globalIndex, label)}
              onDismiss={() => handleDismiss(globalIndex)}
            />
          )
        })}

        {kanjiSuggestions.length > 0 && (
          <div className="border-t border-gray-200 pt-2">
            <button
              onClick={() => setKanjiExpanded(!kanjiExpanded)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {kanjiExpanded ? '▼' : '▶'} 同漢字 ({kanjiSuggestions.length}件)
            </button>
            {kanjiExpanded &&
              kanjiSuggestions.map((s) => {
                const globalIndex = suggestions.indexOf(s)
                const isDone = decided.has(globalIndex)
                return (
                  <SuggestionItem
                    key={globalIndex}
                    suggestion={s}
                    entryTerm={entry.term}
                    decided={isDone}
                    onConfirm={(label) => handleConfirm(globalIndex, label)}
                    onDismiss={() => handleDismiss(globalIndex)}
                  />
                )
              })}
          </div>
        )}
      </div>

      {allDecided && (
        <button
          onClick={onClose}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          完了
        </button>
      )}
    </div>
  )
}

function SuggestionItem({
  suggestion,
  entryTerm,
  decided,
  onConfirm,
  onDismiss,
}: {
  suggestion: ConnectionSuggestion
  entryTerm: string
  decided: boolean
  onConfirm: (userLabel?: string) => void
  onDismiss: () => void
}) {
  const [label, setLabel] = useState('')
  const isOther = suggestion.type === 'OTHER'
  const canConfirm = !isOther || label.trim() !== ''

  if (decided) return null

  return (
    <div className="flex items-start gap-3 rounded-md bg-white p-3 shadow-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entryTerm}</span>
          <span className="text-gray-400">↔</span>
          <span className="text-sm font-medium">{suggestion.targetEntry.term}</span>
          <ConnectionBadge type={suggestion.type} />
        </div>
        <p className="mt-1 text-xs text-gray-500">{suggestion.reasoning}</p>
        {isOther && (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="関係の説明 *"
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-500 focus:outline-none"
          />
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => onConfirm(label)}
          disabled={!canConfirm}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
        >
          確認
        </button>
        <button
          onClick={onDismiss}
          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          却下
        </button>
      </div>
    </div>
  )
}
