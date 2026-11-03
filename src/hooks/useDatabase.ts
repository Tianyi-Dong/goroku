import { useState, useEffect, useContext, createContext } from 'react'
import { initDatabase, isDatabasePersistent, onPersistErrorChange } from '../db/database'
import { initFileBackup } from '../services/fileBackup'

interface DatabaseState {
  ready: boolean
  error: string | null
  persistent: boolean
  persistError: string | null
}

const DatabaseContext = createContext<DatabaseState>({
  ready: false,
  error: null,
  persistent: false,
  persistError: null,
})

export function useDatabaseContext() {
  return useContext(DatabaseContext)
}

export { DatabaseContext }

export function useDatabaseInit(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({
    ready: false,
    error: null,
    persistent: false,
    persistError: null,
  })

  useEffect(() => {
    initDatabase()
      .then(async () => {
        await initFileBackup().catch((e) => console.warn('File backup init failed:', e))
        setState((prev) => ({ ...prev, ready: true, error: null, persistent: isDatabasePersistent() }))
      })
      .catch((e) => setState((prev) => ({ ...prev, ready: false, error: (e as Error).message })))
  }, [])

  // Independent of init: an ongoing save can start failing at any point during the
  // session (disk full, quota exceeded, permission revoked) — see database.ts's
  // setPersistError for why this needs to be user-visible rather than console-only.
  useEffect(() => {
    return onPersistErrorChange((persistError) => setState((prev) => ({ ...prev, persistError })))
  }, [])

  return state
}
