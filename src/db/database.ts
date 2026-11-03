import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import schema from './schema.sql?raw'

// Architecture:
// - SQLite runs IN-MEMORY on the main thread, so all query helpers stay
//   synchronous and the rest of the app needs no changes.
// - The full database is snapshotted (serialized) to OPFS — the browser's
//   on-disk private file system — through a Worker (see opfsWorker.ts), because
//   the fast synchronous OPFS write API is only available off the main thread.
//   This persists across browser/computer restarts and needs NO
//   SharedArrayBuffer / Atomics.wait / COOP+COEP headers (the cause of the
//   previous failure).
// - If OPFS is unavailable, we fall back to snapshotting into IndexedDB.
// - Snapshots are debounced and also flushed when the tab is hidden/closed.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlite3: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null

type PersistMode = 'opfs' | 'indexeddb' | 'none'
let persistMode: PersistMode = 'none'

export function isDatabasePersistent(): boolean {
  return persistMode !== 'none'
}

export function getPersistMode(): PersistMode {
  return persistMode
}

// ---- Persist-failure surfacing ----
//
// doSnapshot() used to just console.warn() when a write failed, which means a user could
// keep editing for an entire session while every single save silently failed (disk full,
// quota exceeded, permission revoked) with no on-screen indication — exactly the kind of
// bug that motivated this audit. lastPersistError / onPersistErrorChange let the UI show
// a banner instead.

let lastPersistError: string | null = null
const persistErrorListeners = new Set<(error: string | null) => void>()

export function getLastPersistError(): string | null {
  return lastPersistError
}

export function onPersistErrorChange(listener: (error: string | null) => void): () => void {
  persistErrorListeners.add(listener)
  return () => persistErrorListeners.delete(listener)
}

function setPersistError(error: string | null) {
  if (error === lastPersistError) return
  lastPersistError = error
  for (const listener of persistErrorListeners) listener(error)
}

// ---- Snapshot notifications (used by the file-backup layer, so it reuses the one
// export below instead of calling exportRawDatabase() again on its own timer) ----

type SnapshotListener = (bytes: Uint8Array) => void
const snapshotListeners = new Set<SnapshotListener>()

export function onDatabaseSnapshot(listener: SnapshotListener): () => void {
  snapshotListeners.add(listener)
  return () => snapshotListeners.delete(listener)
}

function notifySnapshot(bytes: Uint8Array) {
  for (const listener of snapshotListeners) {
    try {
      listener(bytes)
    } catch (e) {
      console.warn('Database snapshot listener failed:', e)
    }
  }
}

// ---- OPFS worker RPC ----

let worker: Worker | null = null
let rpcId = 0
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function startWorker(): Worker {
  const w = new Worker(new URL('./opfsWorker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent) => {
    const { id, ok, bytes, error } = e.data
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (ok) entry.resolve(bytes ?? null)
    else entry.reject(new Error(error))
  }
  return w
}

function workerCall(type: 'load'): Promise<Uint8Array | null>
function workerCall(type: 'save', bytes: Uint8Array): Promise<null>
function workerCall(type: 'load' | 'save', bytes?: Uint8Array): Promise<unknown> {
  if (!worker) return Promise.reject(new Error('worker not started'))
  const id = ++rpcId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    if (type === 'save' && bytes) {
      // Copy out of WASM memory before transfer.
      const copy = bytes.slice()
      worker!.postMessage({ id, type, bytes: copy }, [copy.buffer])
    } else {
      worker!.postMessage({ id, type })
    }
  })
}

// ---- IndexedDB fallback ----

const IDB_NAME = 'goroku-persist'
const IDB_STORE = 'data'
const IDB_KEY = 'db-bytes'

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbLoad(): Promise<Uint8Array | null> {
  try {
    const idb = await openIdb()
    return await new Promise<Uint8Array | null>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => {
        idb.close()
        resolve(req.result instanceof Uint8Array ? req.result : null)
      }
      req.onerror = () => {
        idb.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

async function idbSave(bytes: Uint8Array): Promise<void> {
  const copy = bytes.slice()
  const idb = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(copy, IDB_KEY)
    tx.oncomplete = () => {
      idb.close()
      resolve()
    }
    tx.onerror = () => {
      idb.close()
      reject(tx.error)
    }
  })
}

// ---- Snapshot orchestration ----

let saveTimer: ReturnType<typeof setTimeout> | null = null
let saveInFlight: Promise<void> = Promise.resolve()

async function doSnapshot(): Promise<void> {
  if (!db) return
  let bytes: Uint8Array
  try {
    bytes = exportRawDatabase()
  } catch (e) {
    console.warn('Snapshot export failed:', e)
    setPersistError('スナップショットの作成に失敗しました: ' + (e as Error).message)
    return
  }

  // One export serves every consumer — the OPFS/IndexedDB persistence below AND the
  // file-backup layer (via onDatabaseSnapshot) — instead of each running its own
  // exportRawDatabase() on a separate timer.
  notifySnapshot(bytes)

  if (persistMode === 'none') return

  // Chain writes so they never overlap.
  saveInFlight = saveInFlight.then(async () => {
    try {
      if (persistMode === 'opfs') await workerCall('save', bytes)
      else if (persistMode === 'indexeddb') await idbSave(bytes)
      setPersistError(null)
    } catch (e) {
      console.warn('Snapshot persist failed:', e)
      setPersistError('保存に失敗しています: ' + (e as Error).message)
    }
  })
  return saveInFlight
}

function scheduleSnapshot() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void doSnapshot()
  }, 400)
}

/** Forces an immediate snapshot and waits for it to be written. */
export async function flushSnapshot(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await doSnapshot()
  await saveInFlight
}

function installFlushHandlers() {
  if (typeof document === 'undefined') return
  // visibilitychange(hidden) is the most reliable "app is going away" signal.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      void doSnapshot()
    }
  })
  window.addEventListener('pagehide', () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      void doSnapshot()
    }
  })
}

// ---- Deserialization ----

function deserializeInto(targetDb: typeof db, bytes: Uint8Array): void {
  const n = bytes.byteLength
  const pData = sqlite3.wasm.alloc(n)
  sqlite3.wasm.heap8u().set(bytes, pData)
  // SQLITE_DESERIALIZE_FREEONCLOSE=1 | SQLITE_DESERIALIZE_RESIZEABLE=2
  const rc = sqlite3.capi.sqlite3_deserialize(targetDb.pointer, 'main', pData, n, n, 1 | 2)
  if (rc !== 0) {
    sqlite3.wasm.dealloc(pData)
    throw new Error('sqlite3_deserialize rc=' + rc)
  }
}

const REQUIRED_TABLES = ['entries', 'connections', 'quiz_sessions', 'quiz_records']

/**
 * sqlite3_deserialize succeeds on ANY valid sqlite file, even one with an unrelated or
 * missing schema — it doesn't know what a "goroku database" is. Without this check,
 * importing a wrong/corrupt .sqlite file would silently replace the live database (and
 * then get persisted to OPFS) with something that isn't a backup at all, only to fail
 * later the first time a query touches a missing table — by which point the user's
 * original data is already gone.
 */
function assertGorokuSchema(candidate: typeof db): void {
  const rows = candidate.exec("SELECT name FROM sqlite_master WHERE type='table'", {
    rowMode: 'array',
    returnValue: 'resultRows',
  }) as unknown[][]
  const tables = new Set(rows.map((r) => r[0]))
  for (const t of REQUIRED_TABLES) {
    if (!tables.has(t)) {
      throw new Error('このファイルは語録のバックアップではないようです')
    }
  }
}

/**
 * `CREATE TABLE IF NOT EXISTS` in schema.sql is a no-op against a table that already
 * exists with the OLD shape, so restoring a pre-workstream-1 snapshot (old
 * `connections.entry_type NOT NULL`, old `entries.source_text`/`source_url`, the old
 * `entries_fts` table) needs a real migration, not a no-op.
 */
function needsPreMergeMigration(targetDb: typeof db): boolean {
  const rows = targetDb.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries_fts'",
    { rowMode: 'array', returnValue: 'resultRows' },
  ) as unknown[][]
  return rows.length > 0
}

/**
 * Migrates a pre-workstream-1 database to the current schema WITHOUT ever deleting the
 * only copy of the user's data.
 *
 * An earlier version of this function used `DROP TABLE` on `entries`, `connections`,
 * `quiz_sessions`, and `quiz_records` the moment it detected the old schema — including
 * the two quiz tables, whose shape never even changed, so there was no reason to touch
 * them at all. That destroyed a real user's accumulated vocabulary/grammar/quiz data
 * with no backup, no confirmation, and only a `console.warn` nobody saw. Never do that
 * again: old `entries`/`connections` are renamed aside (kept, not deleted) and their
 * rows are copied into freshly created tables in the new shape. If anything about this
 * migration is wrong, the original data is still sitting right there under the
 * `_premerge_backup` name, inspectable and recoverable.
 */
function migratePreMergeSchema(targetDb: typeof db): void {
  for (const trigger of ['entries_ai', 'entries_ad', 'entries_au']) {
    targetDb.exec(`DROP TRIGGER IF EXISTS ${trigger}`)
  }
  targetDb.exec('DROP TABLE IF EXISTS entries_fts')

  targetDb.exec('ALTER TABLE entries RENAME TO entries_premerge_backup')
  targetDb.exec('ALTER TABLE connections RENAME TO connections_premerge_backup')

  // Recreates `entries` / `connections` in the new shape (schema.sql's CREATE TABLE IF
  // NOT EXISTS now applies cleanly since the old tables were renamed out of the way).
  // quiz_sessions / quiz_records are untouched — their shape never changed.
  targetDb.exec(schema)

  // The old entry-level source has no home in the new per-example shape (workstream 3),
  // so it's folded into `notes` rather than silently dropped.
  targetDb.exec(`
    INSERT INTO entries (id, type, term, reading, meanings, part_of_speech, register, attachment_rules, usage_context, examples, notes, created_at, updated_at)
    SELECT id, type, term, reading, meanings, part_of_speech, register, attachment_rules, usage_context, examples,
      CASE WHEN source_text IS NOT NULL
        THEN COALESCE(notes || char(10), '') || '[出典: ' || source_text || COALESCE(' ' || source_url, '') || ']'
        ELSE notes
      END,
      created_at, updated_at
    FROM entries_premerge_backup
  `)

  targetDb.exec(`
    INSERT INTO connections (id, source_id, target_id, type, user_label, ai_reasoning, confirmed_by_user, created_at)
    SELECT id, source_id, target_id, type, user_label, ai_reasoning, confirmed_by_user, created_at
    FROM connections_premerge_backup
  `)
}

// ---- Initialization ----

async function chooseStorageAndLoad(): Promise<Uint8Array | null> {
  // Try OPFS (via worker) first; it's true on-disk storage.
  try {
    worker = startWorker()
    const bytes = await workerCall('load')
    persistMode = 'opfs'
    // Best-effort: ask the browser not to evict our data.
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {})
    }
    console.info('Database: persisting to OPFS' + (bytes ? ' (restored snapshot)' : ' (new)'))
    return bytes
  } catch (e) {
    console.warn('OPFS persistence unavailable, trying IndexedDB:', e)
    if (worker) {
      worker.terminate()
      worker = null
    }
  }

  // Fall back to IndexedDB.
  try {
    const bytes = await idbLoad()
    persistMode = 'indexeddb'
    console.info('Database: persisting to IndexedDB' + (bytes ? ' (restored snapshot)' : ' (new)'))
    return bytes
  } catch (e) {
    console.error('No persistent storage available — data will NOT survive reload:', e)
    persistMode = 'none'
    return null
  }
}

export async function initDatabase(): Promise<void> {
  if (db) return

  sqlite3 = await sqlite3InitModule()

  const savedBytes = await chooseStorageAndLoad()

  db = new sqlite3.oo1.DB(':memory:')

  if (savedBytes && savedBytes.byteLength > 100) {
    try {
      deserializeInto(db, savedBytes)
      if (needsPreMergeMigration(db)) {
        console.warn('Database: pre-workstream-1 schema detected, migrating entries/connections to the new shape (old tables kept as *_premerge_backup)')
        migratePreMergeSchema(db)
      }
      db.exec(schema) // idempotent; ensures schema for older snapshots
      console.info('Database: restored ' + savedBytes.byteLength + ' bytes')
    } catch (e) {
      console.warn('Failed to restore snapshot, starting fresh:', e)
      db.close()
      db = new sqlite3.oo1.DB(':memory:')
      db.exec(schema)
    }
  } else {
    db.exec(schema)
  }

  db.exec('PRAGMA foreign_keys=ON')
  installFlushHandlers()
}

function getDb() {
  if (!db) throw new Error('Database not initialized')
  return db
}

// ---- Query helpers ----

export function getAll<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): T[] {
  return getDb().exec(sql, {
    bind: params as never,
    rowMode: 'object',
    returnValue: 'resultRows',
  }) as T[]
}

export function run(sql: string, params?: unknown[]): void {
  getDb().exec(sql, { bind: params as never })
  scheduleSnapshot()
}

export function getOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): T | null {
  const rows = getAll<T>(sql, params)
  return rows[0] ?? null
}

// ---- Raw export / import ----

export function exportRawDatabase(): Uint8Array {
  return new Uint8Array(sqlite3.capi.sqlite3_js_db_export(getDb().pointer))
}

export async function importRawDatabase(bytes: Uint8Array): Promise<void> {
  const newDb = new sqlite3.oo1.DB(':memory:')
  try {
    deserializeInto(newDb, bytes)
    assertGorokuSchema(newDb)
  } catch (e) {
    newDb.close()
    throw e
  }
  // Only swap the live database (and let it get persisted) once it's been validated —
  // see assertGorokuSchema.
  db.close()
  db = newDb
  db.exec('PRAGMA foreign_keys=ON')
  await flushSnapshot()
}
