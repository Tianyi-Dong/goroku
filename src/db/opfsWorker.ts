/// <reference lib="webworker" />
//
// Persists the SQLite database snapshot to OPFS (the browser's on-disk private
// file system). Runs in a Worker because `createSyncAccessHandle()` — the fast,
// synchronous OPFS write API — is only available off the main thread. This
// requires NO SharedArrayBuffer, Atomics.wait, or COOP/COEP headers.

const FILENAME = 'goroku.sqlite'

type LoadReq = { id: number; type: 'load' }
type SaveReq = { id: number; type: 'save'; bytes: Uint8Array }
type Req = LoadReq | SaveReq

// Serialize all OPFS operations: createSyncAccessHandle is exclusive per file,
// so overlapping handlers must not race.
let queue: Promise<unknown> = Promise.resolve()

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory()
}

async function loadBytes(): Promise<Uint8Array | null> {
  const root = await getRoot()
  let fileHandle: FileSystemFileHandle
  try {
    fileHandle = await root.getFileHandle(FILENAME, { create: false })
  } catch {
    return null // no snapshot yet
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sah = await (fileHandle as any).createSyncAccessHandle()
  try {
    const size = sah.getSize()
    const buf = new Uint8Array(size)
    if (size > 0) sah.read(buf, { at: 0 })
    return buf
  } finally {
    sah.close()
  }
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const root = await getRoot()
  const fileHandle = await root.getFileHandle(FILENAME, { create: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sah = await (fileHandle as any).createSyncAccessHandle()
  try {
    sah.truncate(0)
    sah.write(bytes, { at: 0 })
    sah.flush()
  } finally {
    sah.close()
  }
}

self.onmessage = (e: MessageEvent<Req>) => {
  const req = e.data
  queue = queue.then(async () => {
    try {
      if (req.type === 'load') {
        const bytes = await loadBytes()
        if (bytes) {
          ;(self as unknown as Worker).postMessage(
            { id: req.id, ok: true, bytes },
            { transfer: [bytes.buffer] },
          )
        } else {
          ;(self as unknown as Worker).postMessage({ id: req.id, ok: true, bytes: null })
        }
      } else {
        await saveBytes(req.bytes)
        ;(self as unknown as Worker).postMessage({ id: req.id, ok: true })
      }
    } catch (err) {
      ;(self as unknown as Worker).postMessage({
        id: req.id,
        ok: false,
        error: (err as Error).message,
      })
    }
  })
}
