import { useMemo } from 'react'
import type { Connection } from '../../types/connection'
import { getEntriesByIds } from '../../db/queries/entries'
import { deleteConnection } from '../../db/queries/connections'
import ConnectionBadge from './ConnectionBadge'

interface ConnectionListProps {
  connections: Connection[]
  currentEntryId: string
  onChanged: () => void
}

export default function ConnectionList({
  connections,
  currentEntryId,
  onChanged,
}: ConnectionListProps) {
  // One batched query for every connection's "other" endpoint, instead of one
  // getEntryById query per row.
  const otherEntries = useMemo(() => {
    const otherIds = connections.map((conn) =>
      conn.sourceId === currentEntryId ? conn.targetId : conn.sourceId,
    )
    const entries = getEntriesByIds(otherIds)
    return new Map(entries.map((e) => [e.id, e]))
  }, [connections, currentEntryId])

  if (connections.length === 0) return null

  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">つながり</dt>
      <dd className="mt-1 space-y-1">
        {connections.map((conn) => {
          const otherId =
            conn.sourceId === currentEntryId ? conn.targetId : conn.sourceId
          const other = otherEntries.get(otherId)
          if (!other) return null

          return (
            <div
              key={conn.id}
              className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
            >
              <ConnectionBadge type={conn.type} />
              <span className="flex-1 text-sm">{other.term}</span>
              {conn.userLabel && (
                <span className="text-xs text-gray-400">{conn.userLabel}</span>
              )}
              <button
                onClick={() => {
                  deleteConnection(conn.id)
                  onChanged()
                }}
                className="text-xs text-gray-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          )
        })}
      </dd>
    </div>
  )
}
