import { isTauri } from '@tauri-apps/api/core'
import { save as tauriSave, open as tauriOpen } from '@tauri-apps/plugin-dialog'
import { writeFile as tauriWriteFile, readFile as tauriReadFile } from '@tauri-apps/plugin-fs'
import { getAll, run, exportRawDatabase, importRawDatabase } from '../db/database'

// WebKit (the engine Tauri uses on macOS) never implemented the File System Access
// API (showSaveFilePicker/showOpenFilePicker), so saveFile/pickFile below branch to
// Tauri's own dialog + fs plugins when running as the packaged app, instead of
// falling all the way back to the anonymous-download/hidden-input path (which works,
// but gives the user no choice of where the file goes).
const runningInTauri = isTauri()

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
  examples: string
  notes: string | null
  created_at: string
  updated_at: string
}

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

interface QuizSessionRow {
  id: string
  score: number
  total: number
  completed_at: string
}

interface QuizRecordRow {
  id: string
  entry_id: string
  session_id: string
  format: string
  correct: number
  reviewed_at: string
}

interface ExportData {
  version: 1
  exportedAt: string
  entries: EntryRow[]
  connections: ConnectionRow[]
  quizSessions: QuizSessionRow[]
  quizRecords: QuizRecordRow[]
}

export function exportToJson(): string {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: getAll<EntryRow>('SELECT * FROM entries'),
    connections: getAll<ConnectionRow>('SELECT * FROM connections'),
    quizSessions: getAll<QuizSessionRow>('SELECT * FROM quiz_sessions'),
    quizRecords: getAll<QuizRecordRow>('SELECT * FROM quiz_records'),
  }
  return JSON.stringify(data, null, 2)
}

export function exportToSqlite(): Uint8Array {
  return exportRawDatabase()
}

export function exportToCsv(): { vocabulary: string; grammar: string; phrase: string } {
  const types = ['vocabulary', 'grammar', 'phrase'] as const
  const result: Record<string, string> = {}

  for (const type of types) {
    const rows = getAll<EntryRow>('SELECT * FROM entries WHERE type = ? ORDER BY created_at', [type])

    const headers = ['term', 'reading', 'meanings', 'part_of_speech', 'register', 'usage_context', 'notes', 'created_at']
    const csvRows = [headers.join(',')]

    for (const row of rows) {
      const meanings = JSON.parse(row.meanings) as string[]
      const register = row.register ? (JSON.parse(row.register) as string[]).join('; ') : ''

      csvRows.push(
        [
          csvEscape(row.term),
          csvEscape(row.reading ?? ''),
          csvEscape(meanings.join('; ')),
          csvEscape(row.part_of_speech ?? ''),
          csvEscape(register),
          csvEscape(row.usage_context ?? ''),
          csvEscape(row.notes ?? ''),
          csvEscape(row.created_at),
        ].join(','),
      )
    }

    result[type] = csvRows.join('\n')
  }

  return result as { vocabulary: string; grammar: string; phrase: string }
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

const ENTRY_TYPES = new Set(['vocabulary', 'grammar', 'phrase'])

/** Throws a clear, Japanese-language error on the first structural problem, before any destructive DB operation runs. */
function validateExportData(data: unknown): asserts data is ExportData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('バックアップファイルの形式が正しくありません')
  }
  const d = data as Partial<ExportData>
  if (d.version !== 1) throw new Error('未対応のバージョンです')
  if (!Array.isArray(d.entries) || !Array.isArray(d.connections) ||
      !Array.isArray(d.quizSessions) || !Array.isArray(d.quizRecords)) {
    throw new Error('バックアップファイルの形式が正しくありません')
  }
  for (const e of d.entries) {
    if (!e || typeof e.id !== 'string' || !e.id ||
        typeof e.type !== 'string' || !ENTRY_TYPES.has(e.type) ||
        typeof e.term !== 'string' || typeof e.meanings !== 'string') {
      throw new Error('エントリーのデータ形式が正しくありません')
    }
  }
  for (const c of d.connections) {
    if (!c || typeof c.id !== 'string' || !c.id ||
        typeof c.source_id !== 'string' || typeof c.target_id !== 'string' ||
        typeof c.type !== 'string') {
      throw new Error('つながりのデータ形式が正しくありません')
    }
  }
}

export function importFromJson(jsonString: string): { entries: number; connections: number } {
  const data: unknown = JSON.parse(jsonString)
  validateExportData(data)

  // Wrapped in one transaction: if any row is rejected partway through (e.g. a foreign
  // key violation), the rollback leaves the previous data intact instead of a half-wiped,
  // half-imported database.
  run('BEGIN TRANSACTION')
  try {
    run('DELETE FROM quiz_records')
    run('DELETE FROM quiz_sessions')
    run('DELETE FROM connections')
    run('DELETE FROM entries')

    for (const e of data.entries) {
      run(
        `INSERT INTO entries (id, type, term, reading, meanings, part_of_speech, register, attachment_rules, usage_context, examples, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.type, e.term, e.reading, e.meanings, e.part_of_speech, e.register, e.attachment_rules, e.usage_context, e.examples, e.notes, e.created_at, e.updated_at],
      )
    }

    for (const c of data.connections) {
      run(
        `INSERT INTO connections (id, source_id, target_id, type, user_label, ai_reasoning, confirmed_by_user, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.source_id, c.target_id, c.type, c.user_label, c.ai_reasoning, c.confirmed_by_user, c.created_at],
      )
    }

    for (const s of data.quizSessions) {
      run(
        'INSERT INTO quiz_sessions (id, score, total, completed_at) VALUES (?, ?, ?, ?)',
        [s.id, s.score, s.total, s.completed_at],
      )
    }

    for (const r of data.quizRecords) {
      run(
        'INSERT INTO quiz_records (id, entry_id, session_id, format, correct, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.entry_id, r.session_id, r.format, r.correct, r.reviewed_at],
      )
    }

    run('COMMIT')
  } catch (e) {
    run('ROLLBACK')
    throw e
  }

  return { entries: data.entries.length, connections: data.connections.length }
}

export async function importFromSqlite(buffer: ArrayBuffer): Promise<{ entries: number; connections: number }> {
  await importRawDatabase(new Uint8Array(buffer))

  const entries = getAll<EntryRow>('SELECT * FROM entries')
  const connections = getAll<ConnectionRow>('SELECT * FROM connections')
  return { entries: entries.length, connections: connections.length }
}

// TS's DOM lib types BlobPart/FileSystemWriteChunkType as requiring an ArrayBuffer-backed
// view specifically (not the wider ArrayBufferLike, which also covers SharedArrayBuffer).
// exportRawDatabase()'s Uint8Array is always ArrayBuffer-backed in practice; this just
// re-asserts that to satisfy the type checker without a runtime copy in the common case.
function toArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes.buffer instanceof ArrayBuffer
    ? (bytes as Uint8Array<ArrayBuffer>)
    : new Uint8Array(bytes)
}

export async function saveFile(data: string | Uint8Array, suggestedName: string, mimeType: string): Promise<void> {
  if (runningInTauri) {
    const ext = suggestedName.split('.').pop() ?? ''
    const path = await tauriSave({
      defaultPath: suggestedName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!path) return // user cancelled
    const bytes = data instanceof Uint8Array ? toArrayBufferView(data) : new TextEncoder().encode(data)
    await tauriWriteFile(path, bytes)
    return
  }

  if ('showSaveFilePicker' in window) {
    const ext = suggestedName.split('.').pop() ?? ''
    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: suggestedName,
          accept: { [mimeType]: ['.' + ext] },
        },
      ],
    })
    const writable = await handle.createWritable()
    await writable.write(data instanceof Uint8Array ? toArrayBufferView(data) : new Blob([data], { type: mimeType }))
    await writable.close()
  } else {
    const blob = data instanceof Uint8Array ? new Blob([toArrayBufferView(data)]) : new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
  }
}

export async function pickFile(accept: string): Promise<File> {
  if (runningInTauri) {
    const extensions = accept.split(',').map((e) => e.trim().replace(/^\./, ''))
    const path = await tauriOpen({ multiple: false, filters: [{ name: 'Backup file', extensions }] })
    if (!path || Array.isArray(path)) throw new Error('ファイルが選択されませんでした')
    const bytes = await tauriReadFile(path)
    const name = path.split(/[/\\]/).pop() ?? path
    return new File([bytes], name)
  }

  if ('showOpenFilePicker' in window) {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Backup file',
          accept: { 'application/octet-stream': accept.split(',') },
        },
      ],
    })
    return handle.getFile()
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.onchange = () => {
        if (input.files?.[0]) resolve(input.files[0])
        else reject(new Error('ファイルが選択されませんでした'))
      }
      input.click()
    })
  }
}
