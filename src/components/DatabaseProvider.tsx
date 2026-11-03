import { type ReactNode } from 'react'
import { DatabaseContext, useDatabaseInit } from '../hooks/useDatabase'

export default function DatabaseProvider({ children }: { children: ReactNode }) {
  const state = useDatabaseInit()

  if (state.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-600">データベースの初期化に失敗しました: {state.error}</p>
      </div>
    )
  }

  if (!state.ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中…</p>
      </div>
    )
  }

  return (
    <DatabaseContext value={state}>
      {children}
    </DatabaseContext>
  )
}
