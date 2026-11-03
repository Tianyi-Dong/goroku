import { isTauri } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { writeFile as tauriWriteFile } from '@tauri-apps/plugin-fs'
import { exportRawDatabase, onDatabaseSnapshot } from '../db/database'

// Mirrors the live database to a real folder on the user's hard drive (iCloud,
// Dropbox, etc.). OPFS is the primary store; this is a durable, user-visible backup
// that survives even "clear all site data".
//
// Two implementations, chosen at runtime via isTauri():
// - Browser (dev, or any non-Tauri host): the File System Access API. Security does
//   NOT keep permission across a full page close — on each launch the stored
//   directory handle reports permission "prompt", and the user must re-grant via a
//   click (see queryPermission/requestPermission below).
// - Tauri desktop app: WebKit (the engine Tauri uses on macOS) never implemented the
//   File System Access API at all, so this path uses Tauri's own dialog + fs plugins
//   instead. Folders are addressed by plain path string (persisted in localStorage,
//   not IndexedDB — there's no handle object to serialize), and the capability
//   granted in src-tauri/capabilities/default.json (fs:scope over $HOME/**) is
//   static, so there is no per-launch re-grant step at all.
//
// Auto-backup reuses the OPFS layer's own debounced snapshot (onDatabaseSnapshot)
// instead of calling exportRawDatabase() again on a second timer — one export per
// edit burst, not two — and that also means it fires the moment the OPFS layer
// flushes on tab-hide/close, so this file doesn't need its own visibilitychange
// handling.

const runningInTauri = isTauri()

const IDB_NAME = 'goroku-backup'
const IDB_STORE = 'handles'
const IDB_KEY = 'backup-dir'
const TAURI_DIR_PATH_KEY = 'goroku-backup-dir-path'
const BACKUP_FILENAME = 'goroku.sqlite'
const LAST_BACKUP_KEY = 'goroku-last-backup-at'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DirHandle = any

export type BackupStatus =
  | { state: 'disabled' }
  | { state: 'needs-permission'; dirName: string }
  | { state: 'active'; dirName: string; lastBackupAt: string | null }
  | { state: 'error'; dirName: string | null; message: string }

// Browser-mode state.
let dirHandle: DirHandle | null = null
let permissionGranted = false

// Tauri-mode state.
let tauriDirPath: string | null = null

const statusListeners = new Set<(s: BackupStatus) => void>()

export function isFileBackupSupported(): boolean {
  if (runningInTauri) return true
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ---- Browser: IndexedDB handle storage ----

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandle(handle: DirHandle | null): Promise<void> {
  const idb = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    if (handle) tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
    else tx.objectStore(IDB_STORE).delete(IDB_KEY)
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

async function loadHandle(): Promise<DirHandle | null> {
  try {
    const idb = await openIdb()
    return await new Promise<DirHandle | null>((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => {
        idb.close()
        resolve(req.result ?? null)
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

// ---- Status ----

function lastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY)
}

function dirNameFromPath(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path
}

export function getBackupStatus(): BackupStatus {
  if (runningInTauri) {
    if (!tauriDirPath) return { state: 'disabled' }
    return { state: 'active', dirName: dirNameFromPath(tauriDirPath), lastBackupAt: lastBackupAt() }
  }
  if (!dirHandle) return { state: 'disabled' }
  if (!permissionGranted) return { state: 'needs-permission', dirName: dirHandle.name }
  return { state: 'active', dirName: dirHandle.name, lastBackupAt: lastBackupAt() }
}

export function subscribeBackupStatus(listener: (s: BackupStatus) => void): () => void {
  statusListeners.add(listener)
  listener(getBackupStatus())
  return () => statusListeners.delete(listener)
}

function emitStatus(status?: BackupStatus) {
  const s = status ?? getBackupStatus()
  for (const l of statusListeners) l(s)
}

// ---- Browser: permission ----

async function queryPermission(handle: DirHandle): Promise<PermissionState> {
  if (!handle.queryPermission) return 'granted'
  return handle.queryPermission({ mode: 'readwrite' })
}

async function requestPermission(handle: DirHandle): Promise<PermissionState> {
  if (!handle.requestPermission) return 'granted'
  return handle.requestPermission({ mode: 'readwrite' })
}

// ---- Backup writes ----

// Chain writes so a slow write to a real folder (network drive, iCloud syncing)
// can never overlap with the next one.
let backupInFlight: Promise<void> = Promise.resolve()

async function writeBackup(bytes?: Uint8Array): Promise<void> {
  if (runningInTauri) {
    if (!tauriDirPath) return
    backupInFlight = backupInFlight.then(async () => {
      try {
        const filePath = await join(tauriDirPath!, BACKUP_FILENAME)
        await tauriWriteFile(filePath, bytes ?? exportRawDatabase())
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
        emitStatus()
      } catch (e) {
        console.warn('Backup write failed:', e)
        emitStatus({ state: 'error', dirName: tauriDirPath ? dirNameFromPath(tauriDirPath) : null, message: (e as Error).message })
      }
    })
    return backupInFlight
  }

  if (!dirHandle || !permissionGranted) return
  backupInFlight = backupInFlight.then(async () => {
    try {
      const fileHandle = await dirHandle.getFileHandle(BACKUP_FILENAME, { create: true })
      const writable = await fileHandle.createWritable()
      // exportRawDatabase() already returns a JS-heap copy (not a view into WASM
      // memory), and workerCall() only slices its own copy for transfer — so `bytes`
      // is safe to write directly with no extra clone.
      await writable.write(bytes ?? exportRawDatabase())
      await writable.close()
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
      emitStatus()
    } catch (e) {
      console.warn('Backup write failed:', e)
      // A revoked permission (e.g. folder moved/unmounted) surfaces here.
      permissionGranted = false
      emitStatus({ state: 'error', dirName: dirHandle?.name ?? null, message: (e as Error).message })
    }
  })
  return backupInFlight
}

// ---- Public actions ----

/**
 * Loads any previously chosen backup folder and wires up auto-backup. In the Tauri
 * app this just re-reads the remembered path (no permission step). In a browser, if
 * it still holds permission (rare after a full close) backup resumes silently;
 * otherwise status becomes 'needs-permission' until the user clicks re-grant. Safe
 * to call once at startup.
 */
export async function initFileBackup(): Promise<void> {
  onDatabaseSnapshot((bytes) => void writeBackup(bytes))

  if (runningInTauri) {
    tauriDirPath = localStorage.getItem(TAURI_DIR_PATH_KEY)
    emitStatus()
    return
  }

  if (!isFileBackupSupported()) return
  const handle = await loadHandle()
  if (!handle) return
  dirHandle = handle
  permissionGranted = (await queryPermission(handle)) === 'granted'
  emitStatus()
}

/** Prompts the user to pick a backup folder (must be called from a click). */
export async function chooseBackupFolder(): Promise<void> {
  if (runningInTauri) {
    const selected = await openDialog({ directory: true, multiple: false, title: 'バックアップフォルダを選択' })
    if (!selected) return // user cancelled
    tauriDirPath = selected
    localStorage.setItem(TAURI_DIR_PATH_KEY, selected)
    emitStatus()
    await writeBackup()
    return
  }

  if (!isFileBackupSupported()) {
    throw new Error('このブラウザはフォルダバックアップに対応していません')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle: DirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
  if ((await requestPermission(handle)) !== 'granted') {
    throw new Error('フォルダへの書き込みが許可されませんでした')
  }
  dirHandle = handle
  permissionGranted = true
  await saveHandle(handle)
  emitStatus()
  await writeBackup()
}

/** Re-grants access to the remembered folder after a restart (call from a click). */
export async function regrantBackupAccess(): Promise<void> {
  if (runningInTauri) {
    // No permission model to re-grant — the fs:scope capability is static. If we're
    // in this state at all it means the remembered path is gone (folder moved or
    // unmounted); just retry the write and let it surface as an error if so.
    await writeBackup()
    return
  }

  if (!dirHandle) throw new Error('バックアップフォルダが設定されていません')
  if ((await requestPermission(dirHandle)) !== 'granted') {
    throw new Error('フォルダへのアクセスが許可されませんでした')
  }
  permissionGranted = true
  emitStatus()
  await writeBackup()
}

/** Writes a backup immediately (call from a click). */
export async function backupNow(): Promise<void> {
  if (runningInTauri) {
    if (!tauriDirPath) throw new Error('バックアップフォルダが設定されていません')
    await writeBackup()
    return
  }

  if (!dirHandle) throw new Error('バックアップフォルダが設定されていません')
  if (!permissionGranted && (await requestPermission(dirHandle)) !== 'granted') {
    throw new Error('フォルダへのアクセスが許可されませんでした')
  }
  permissionGranted = true
  await writeBackup()
}

/** Stops auto-backup and forgets the folder. */
export async function disableFileBackup(): Promise<void> {
  if (runningInTauri) {
    tauriDirPath = null
    localStorage.removeItem(TAURI_DIR_PATH_KEY)
    emitStatus()
    return
  }

  dirHandle = null
  permissionGranted = false
  await saveHandle(null)
  emitStatus()
}
