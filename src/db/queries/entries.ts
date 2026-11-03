import { v4 as uuid } from 'uuid'
import { getAll, getOne, run } from '../database'
import type {
  Entry,
  EntryType,
  AttachmentRules,
  ExampleSentence,
} from '../../types/entry'

interface EntryRow {
  id: string
  type: string
  term: string
  reading: string | null
  meanings: string
  part_of_speech: string | null
  register: string | null
  attachment_rules: string | null
  usage_context: string | null
  examples: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    type: row.type as EntryType,
    term: row.term,
    reading: row.reading,
    meanings: JSON.parse(row.meanings) as string[],
    partOfSpeech: row.part_of_speech,
    register: row.register ? (JSON.parse(row.register) as string[]) : [],
    attachmentRules: row.attachment_rules
      ? (JSON.parse(row.attachment_rules) as AttachmentRules)
      : null,
    usageContext: row.usage_context,
    examples: row.examples
      ? (JSON.parse(row.examples) as ExampleSentence[])
      : [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface CreateEntryInput {
  type: EntryType
  term: string
  reading?: string | null
  meanings: string[]
  partOfSpeech?: string | null
  register?: string[]
  attachmentRules?: AttachmentRules | null
  usageContext?: string | null
  examples?: ExampleSentence[]
  notes?: string | null
}

export function createEntry(input: CreateEntryInput): Entry {
  const id = uuid()
  const now = new Date().toISOString()

  run(
    `INSERT INTO entries (id, type, term, reading, meanings, part_of_speech, register, attachment_rules, usage_context, examples, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      input.term,
      input.reading ?? null,
      JSON.stringify(input.meanings),
      input.partOfSpeech ?? null,
      input.register?.length ? JSON.stringify(input.register) : null,
      input.attachmentRules ? JSON.stringify(input.attachmentRules) : null,
      input.usageContext ?? null,
      input.examples?.length ? JSON.stringify(input.examples) : null,
      input.notes ?? null,
      now,
      now,
    ],
  )

  return getEntryById(id)!
}

export function getEntryById(id: string): Entry | null {
  const row = getOne<EntryRow>(
    'SELECT * FROM entries WHERE id = ?',
    [id],
  )
  return row ? rowToEntry(row) : null
}

export function getEntriesByType(type: EntryType): Entry[] {
  const rows = getAll<EntryRow>(
    'SELECT * FROM entries WHERE type = ? ORDER BY created_at DESC',
    [type],
  )
  return rows.map(rowToEntry)
}

export function getAllEntries(): Entry[] {
  const rows = getAll<EntryRow>(
    'SELECT * FROM entries ORDER BY created_at DESC',
  )
  return rows.map(rowToEntry)
}

/** Batched lookup — avoids one query per id (e.g. resolving every connection's other endpoint). */
export function getEntriesByIds(ids: string[]): Entry[] {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const rows = getAll<EntryRow>(
    `SELECT * FROM entries WHERE id IN (${placeholders})`,
    ids,
  )
  return rows.map(rowToEntry)
}

export type UpdateEntryInput = Partial<Omit<CreateEntryInput, 'type'>>

export function updateEntry(
  id: string,
  input: UpdateEntryInput,
): Entry | null {
  const existing = getEntryById(id)
  if (!existing) return null

  const fields: string[] = []
  const values: unknown[] = []

  if (input.term !== undefined) {
    fields.push('term = ?')
    values.push(input.term)
  }
  if (input.reading !== undefined) {
    fields.push('reading = ?')
    values.push(input.reading)
  }
  if (input.meanings !== undefined) {
    fields.push('meanings = ?')
    values.push(JSON.stringify(input.meanings))
  }
  if (input.partOfSpeech !== undefined) {
    fields.push('part_of_speech = ?')
    values.push(input.partOfSpeech)
  }
  if (input.register !== undefined) {
    fields.push('register = ?')
    values.push(input.register.length ? JSON.stringify(input.register) : null)
  }
  if (input.attachmentRules !== undefined) {
    fields.push('attachment_rules = ?')
    values.push(input.attachmentRules ? JSON.stringify(input.attachmentRules) : null)
  }
  if (input.usageContext !== undefined) {
    fields.push('usage_context = ?')
    values.push(input.usageContext)
  }
  if (input.examples !== undefined) {
    fields.push('examples = ?')
    values.push(input.examples.length ? JSON.stringify(input.examples) : null)
  }
  if (input.notes !== undefined) {
    fields.push('notes = ?')
    values.push(input.notes)
  }

  if (fields.length === 0) return existing

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  run(
    `UPDATE entries SET ${fields.join(', ')} WHERE id = ?`,
    values,
  )

  return getEntryById(id)!
}

export function deleteEntry(id: string): void {
  run('DELETE FROM entries WHERE id = ?', [id])
}

export function checkDuplicate(
  type: EntryType,
  term: string,
): boolean {
  const row = getOne<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM entries WHERE type = ? AND term = ?',
    [type, term],
  )
  return (row?.cnt ?? 0) > 0
}
