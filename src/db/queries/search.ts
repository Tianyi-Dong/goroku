import { getAll } from '../database'
import type { Entry, EntryType } from '../../types/entry'

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
    register: row.register ? JSON.parse(row.register) : [],
    attachmentRules: row.attachment_rules ? JSON.parse(row.attachment_rules) : null,
    usageContext: row.usage_context,
    examples: row.examples ? JSON.parse(row.examples) : [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Escapes a LIKE pattern's own wildcard characters so user input like "50%" is matched literally. */
function likeEscape(query: string): string {
  return query.replace(/[\\%_]/g, (c) => '\\' + c)
}

export function searchByTerm(query: string): Entry[] {
  const escaped = likeEscape(query)
  const rows = getAll<EntryRow>(
    `SELECT e.* FROM entries e
     WHERE e.term LIKE ? ESCAPE '\\' OR e.term LIKE ? ESCAPE '\\'
     ORDER BY
       CASE WHEN e.term = ? THEN 0
            WHEN e.term LIKE ? ESCAPE '\\' THEN 1
            ELSE 2 END,
       e.created_at DESC
     LIMIT 20`,
    [
      `${escaped}%`,
      `%${escaped}%`,
      query,
      `${escaped}%`,
    ],
  )
  return rows.map(rowToEntry)
}

// Plain multi-column LIKE, not FTS5 MATCH: unicode61 doesn't segment Japanese, so a run
// of kana/kanji becomes one token and MATCH-based prefix search misses substrings like
// 勉強 inside 猛勉強する. LIKE does a real substring match regardless of tokenization —
// see the note above CREATE TABLE connections in schema.sql for the full reasoning.
export function searchFullText(query: string): Entry[] {
  const pattern = `%${likeEscape(query)}%`
  const rows = getAll<EntryRow>(
    `SELECT * FROM entries
     WHERE term LIKE ? ESCAPE '\\'
        OR reading LIKE ? ESCAPE '\\'
        OR meanings LIKE ? ESCAPE '\\'
        OR notes LIKE ? ESCAPE '\\'
        OR examples LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC
     LIMIT 20`,
    [pattern, pattern, pattern, pattern, pattern],
  )
  return rows.map(rowToEntry)
}
