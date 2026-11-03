import { useState, useCallback, useEffect } from 'react'
import type { Entry } from '../../types/entry'
import type { Connection } from '../../types/connection'
import type { CreateEntryInput, UpdateEntryInput } from '../../db/queries/entries'
import { updateEntry, deleteEntry, getEntryById } from '../../db/queries/entries'
import { getConnectionsForEntry } from '../../db/queries/connections'
import { getEntryPerformance, type EntryPerformance } from '../../db/queries/quiz'
import { isUrl } from '../../utils/url'
import { formatAttachmentRules } from '../../utils/attachmentRules'
import { entryTypeShortLabels } from '../../config/entryTypes'
import Drawer from '../ui/Drawer'
import EntryForm from './EntryForm'
import ConnectionList from '../connection/ConnectionList'
import ManualConnectionForm from '../connection/ManualConnectionForm'
import SuggestionPanel from '../connection/SuggestionPanel'

interface EntryDetailDrawerProps {
  entry: Entry | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
  // Fired whenever a connection is added/removed/edited from inside this drawer
  // (manual add, AI suggestion confirm, label edit). Separate from onUpdated — which
  // fires only for entry edits/deletes — because a parent that caches its own list of
  // connections (e.g. GraphView, which no longer re-queries the DB on every render)
  // needs to know about this too, but shouldn't necessarily react the same way
  // (SpreadsheetView's onUpdated also closes the drawer, which a mere connection
  // change should not do).
  onConnectionsChanged?: () => void
  showSuggestions?: boolean
}

export default function EntryDetailDrawer({
  entry: initialEntry,
  open,
  onClose,
  onUpdated,
  onConnectionsChanged: notifyConnectionsChanged,
  showSuggestions = false,
}: EntryDetailDrawerProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [suggestionsVisible, setSuggestionsVisible] = useState(showSuggestions)
  const [refreshKey, setRefreshKey] = useState(0)

  // Read once per (entry, refreshKey) into state, instead of re-querying the DB on every
  // render — this drawer can re-render often (parent state, hover, etc.) without the
  // underlying data having changed.
  const [entry, setEntry] = useState<Entry | null>(initialEntry)
  const [connections, setConnections] = useState<Connection[]>([])
  const [performance, setPerformance] = useState<EntryPerformance | null>(null)

  useEffect(() => {
    if (!initialEntry) {
      setEntry(null)
      setConnections([])
      setPerformance(null)
      return
    }
    setEntry(getEntryById(initialEntry.id) ?? initialEntry)
    setConnections(getConnectionsForEntry(initialEntry.id))
    setPerformance(getEntryPerformance(initialEntry.id))
  }, [initialEntry, refreshKey])

  const handleClose = useCallback(() => {
    setEditing(false)
    setShowManualForm(false)
    setSuggestionsVisible(false)
    onClose()
  }, [onClose])

  const handleSave = useCallback(
    (data: CreateEntryInput | UpdateEntryInput) => {
      if (!entry) return
      setSaving(true)
      updateEntry(entry.id, data as UpdateEntryInput)
      setSaving(false)
      setEditing(false)
      onUpdated()
    },
    [entry, onUpdated],
  )

  const handleDelete = useCallback(() => {
    if (!entry) return
    deleteEntry(entry.id)
    handleClose()
    onUpdated()
  }, [entry, handleClose, onUpdated])

  const handleConnectionsChanged = useCallback(() => {
    setRefreshKey((k) => k + 1)
    notifyConnectionsChanged?.()
  }, [notifyConnectionsChanged])

  const [prevEntryId, setPrevEntryId] = useState<string | null>(null)
  const currentId = initialEntry?.id ?? null
  if (currentId !== prevEntryId) {
    setPrevEntryId(currentId)
    setSuggestionsVisible(showSuggestions)
    setShowManualForm(false)
    setEditing(false)
  }

  if (!entry) return null

  return (
    <Drawer open={open} onClose={handleClose}>
      {editing ? (
        <EntryForm
          entryType={entry.type}
          initial={entry}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {entryTypeShortLabels[entry.type]}
              </span>
              <h2 className="mt-1 text-xl font-bold">{entry.term}</h2>
              {entry.reading && (
                <p className="text-sm text-gray-500">{entry.reading}</p>
              )}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {entry.partOfSpeech && (
            <div>
              <dt className="text-xs font-medium text-gray-500">品詞</dt>
              <dd className="text-sm">{entry.partOfSpeech}</dd>
            </div>
          )}

          {entry.register.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500">使用域</dt>
              <dd className="flex gap-1">
                {entry.register.map((r) => (
                  <span
                    key={r}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {r}
                  </span>
                ))}
              </dd>
            </div>
          )}

          {entry.attachmentRules &&
            formatAttachmentRules(entry.attachmentRules) && (
              <div>
                <dt className="text-xs font-medium text-gray-500">接続ルール</dt>
                <dd className="text-sm">
                  {formatAttachmentRules(entry.attachmentRules)}
                </dd>
              </div>
            )}

          <div>
            <dt className="text-xs font-medium text-gray-500">意味</dt>
            <dd>
              <ul className="list-inside list-disc text-sm">
                {entry.meanings.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </dd>
          </div>

          {entry.usageContext && (
            <div>
              <dt className="text-xs font-medium text-gray-500">使用場面</dt>
              <dd className="text-sm">{entry.usageContext}</dd>
            </div>
          )}

          {entry.examples.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500">例文</dt>
              <dd className="space-y-2 pt-1">
                {entry.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-gray-100 bg-gray-50 p-2"
                  >
                    <p className="text-sm">{ex.japanese}</p>
                    <p className="text-xs text-gray-500">{ex.translation}</p>
                    {ex.source && (
                      <p className="mt-1 text-xs text-gray-400">
                        出典:{' '}
                        {isUrl(ex.source) ? (
                          <a
                            href={ex.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {ex.source}
                          </a>
                        ) : (
                          ex.source
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </dd>
            </div>
          )}

          {entry.notes && (
            <div>
              <dt className="text-xs font-medium text-gray-500">メモ</dt>
              <dd className="whitespace-pre-wrap text-sm">{entry.notes}</dd>
            </div>
          )}

          <ConnectionList
            connections={connections}
            currentEntryId={entry.id}
            onChanged={handleConnectionsChanged}
          />

          {suggestionsVisible && (
            <SuggestionPanel
              entry={entry}
              onClose={() => setSuggestionsVisible(false)}
              onConnectionsChanged={handleConnectionsChanged}
            />
          )}

          {showManualForm && (
            <ManualConnectionForm
              entry={entry}
              onDone={() => {
                setShowManualForm(false)
                handleConnectionsChanged()
              }}
            />
          )}

          {performance && performance.totalAttempts > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500">復習成績</dt>
              <dd className="text-sm">
                {performance.percentCorrect}% 正解 ({performance.correctCount}/{performance.totalAttempts})
                {performance.lastReviewedAt && (
                  <span className="ml-2 text-xs text-gray-400">
                    最終: {new Date(performance.lastReviewedAt).toLocaleDateString('ja-JP')}
                  </span>
                )}
              </dd>
            </div>
          )}

          <div className="text-xs text-gray-400">
            追加日: {new Date(entry.createdAt).toLocaleDateString('ja-JP')}
            {' · '}
            更新日: {new Date(entry.updatedAt).toLocaleDateString('ja-JP')}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              削除
            </button>
            {!showManualForm && (
              <button
                onClick={() => setShowManualForm(true)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                手動でつながりを追加
              </button>
            )}
            {!suggestionsVisible && (
              <button
                onClick={() => setSuggestionsVisible(true)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                つながり提案を再実行
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
