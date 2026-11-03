import { type ReactNode } from 'react'
import type { Entry } from '../../types/entry'
import { useDatabaseContext } from '../../hooks/useDatabase'
import NavBar from './NavBar'

interface AppShellProps {
  children: ReactNode
  onSearchSelect: (entry: Entry) => void
}

export default function AppShell({ children, onSearchSelect }: AppShellProps) {
  const { persistent, persistError } = useDatabaseContext()

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <NavBar onSearchSelect={onSearchSelect} />
      {!persistent && (
        <div className="bg-amber-50 px-6 py-2 text-center text-xs text-amber-700">
          ⚠ データは一時メモリに保存されています（ブラウザを閉じると消えます）。永続化にはChromeで
          <code className="mx-1 rounded bg-amber-100 px-1">npm run dev</code>
          経由でアクセスしてください。
        </div>
      )}
      {persistent && persistError && (
        <div className="bg-red-50 px-6 py-2 text-center text-xs text-red-700">
          ⚠ {persistError}（このままだと変更が失われる可能性があります。ストレージの空き容量を確認するか、エクスポートで手動バックアップしてください）
        </div>
      )}
      <main className="p-6">{children}</main>
    </div>
  )
}
