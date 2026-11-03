import { v4 as uuid } from 'uuid'
import { getAll, getOne, run } from '../database'
import type { Connection } from '../../types/connection'

interface ConnectionRow {
  id: string
  source_id: string
  target_id: string
  type: string
  user_label: string | null
  ai_reasoning: string | null
  confirmed_by_user: number
  created_at: string
}

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    type: row.type,
    userLabel: row.user_label,
    aiReasoning: row.ai_reasoning,
    confirmedByUser: row.confirmed_by_user === 1,
    createdAt: row.created_at,
  }
}

export interface CreateConnectionInput {
  sourceId: string
  targetId: string
  type: string
  userLabel?: string | null
  aiReasoning?: string | null
  confirmedByUser: boolean
}

export function createConnection(input: CreateConnectionInput): Connection {
  const id = uuid()
  const now = new Date().toISOString()

  run(
    `INSERT INTO connections (id, source_id, target_id, type, user_label, ai_reasoning, confirmed_by_user, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.sourceId,
      input.targetId,
      input.type,
      input.userLabel ?? null,
      input.aiReasoning ?? null,
      input.confirmedByUser ? 1 : 0,
      now,
    ],
  )

  return getConnectionById(id)!
}

export function getConnectionById(id: string): Connection | null {
  const row = getOne<ConnectionRow>('SELECT * FROM connections WHERE id = ?', [id])
  return row ? rowToConnection(row) : null
}

export function getConnectionsForEntry(entryId: string): Connection[] {
  const rows = getAll<ConnectionRow>(
    `SELECT * FROM connections
     WHERE source_id = ? OR target_id = ?
     ORDER BY created_at DESC`,
    [entryId, entryId],
  )
  return rows.map(rowToConnection)
}

export function getAllConnections(): Connection[] {
  const rows = getAll<ConnectionRow>('SELECT * FROM connections ORDER BY created_at DESC')
  return rows.map(rowToConnection)
}

export function deleteConnection(id: string): void {
  run('DELETE FROM connections WHERE id = ?', [id])
}

export function updateConnectionLabel(id: string, userLabel: string | null): void {
  run('UPDATE connections SET user_label = ? WHERE id = ?', [userLabel, id])
}

export function connectionExists(sourceId: string, targetId: string, type: string): boolean {
  const row = getOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM connections
     WHERE ((source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?))
     AND type = ?`,
    [sourceId, targetId, targetId, sourceId, type],
  )
  return (row?.cnt ?? 0) > 0
}

/**
 * Ids of every other entry already connected to `entryId`, optionally filtered to one
 * connection type — one query, used to skip re-checking each candidate individually
 * (e.g. in sameKanjiDetector, which used to run one `connectionExists` query per
 * candidate).
 */
export function getConnectedIds(entryId: string, type?: string): Set<string> {
  const rows = type
    ? getAll<{ source_id: string; target_id: string }>(
        'SELECT source_id, target_id FROM connections WHERE (source_id = ? OR target_id = ?) AND type = ?',
        [entryId, entryId, type],
      )
    : getAll<{ source_id: string; target_id: string }>(
        'SELECT source_id, target_id FROM connections WHERE source_id = ? OR target_id = ?',
        [entryId, entryId],
      )
  const ids = new Set<string>()
  for (const row of rows) {
    ids.add(row.source_id === entryId ? row.target_id : row.source_id)
  }
  return ids
}
