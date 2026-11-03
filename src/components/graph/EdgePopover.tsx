import { useState } from 'react'
import type { Connection } from '../../types/connection'
import { getEntryById } from '../../db/queries/entries'
import { deleteConnection, updateConnectionLabel } from '../../db/queries/connections'
import ConnectionBadge from '../connection/ConnectionBadge'

interface EdgePopoverProps {
  connection: Connection
  position: { x: number; y: number }
  onClose: () => void
  onChanged: () => void
}

export default function EdgePopover({
  connection,
  position,
  onClose,
  onChanged,
}: EdgePopoverProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [label, setLabel] = useState(connection.userLabel ?? '')

  const source = getEntryById(connection.sourceId)
  const target = getEntryById(connection.targetId)

  const handleDelete = () => {
    deleteConnection(connection.id)
    onChanged()
    onClose()
  }

  const handleSaveLabel = () => {
    updateConnectionLabel(connection.id, label.trim() || null)
    setEditingLabel(false)
    onChanged()
  }

  return (
    <div
      className="absolute z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, 8px)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <ConnectionBadge type={connection.type} />
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="font-medium">{source?.term ?? '?'}</span>
        <span className="text-gray-400">↔</span>
        <span className="font-medium">{target?.term ?? '?'}</span>
      </div>

      {connection.aiReasoning && (
        <p className="mb-2 text-xs text-gray-500">{connection.aiReasoning}</p>
      )}

      {editingLabel ? (
        <div className="mb-2 flex gap-1">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-500 focus:outline-none"
            placeholder="ラベル"
            autoFocus
          />
          <button
            onClick={handleSaveLabel}
            className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
          >
            保存
          </button>
        </div>
      ) : (
        <div className="mb-2">
          {connection.userLabel && (
            <p className="text-xs text-gray-500">ラベル: {connection.userLabel}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 border-t border-gray-100 pt-2">
        <button
          onClick={() => setEditingLabel(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {connection.userLabel ? 'ラベル編集' : 'ラベル追加'}
        </button>
        <button
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700"
        >
          削除
        </button>
      </div>
    </div>
  )
}
