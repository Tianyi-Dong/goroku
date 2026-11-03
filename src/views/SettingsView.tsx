import { useState, useCallback, useEffect } from 'react'
import { getAIConfig, saveAIConfig } from '../services/ai'
import {
  type ShortcutBinding,
  getNewEntryShortcut,
  saveNewEntryShortcut,
  resetNewEntryShortcut,
  captureShortcutFromEvent,
  formatShortcut,
  DEFAULT_NEW_ENTRY_SHORTCUT,
} from '../services/keyboardShortcuts'
import {
  exportToJson,
  exportToSqlite,
  exportToCsv,
  importFromJson,
  importFromSqlite,
  saveFile,
  pickFile,
} from '../services/dataExport'
import {
  type BackupStatus,
  isFileBackupSupported,
  subscribeBackupStatus,
  chooseBackupFolder,
  regrantBackupAccess,
  backupNow,
  disableFileBackup,
} from '../services/fileBackup'

export default function SettingsView() {
  const existing = getAIConfig()
  const [endpoint, setEndpoint] = useState(existing?.endpoint ?? 'https://api.deepseek.com/v1')
  const [model, setModel] = useState(existing?.model ?? 'deepseek-chat')
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '')
  const [aiSaved, setAiSaved] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<BackupStatus>({ state: 'disabled' })
  const [newEntryShortcut, setNewEntryShortcut] = useState<ShortcutBinding>(getNewEntryShortcut())
  const [recording, setRecording] = useState(false)

  useEffect(() => subscribeBackupStatus(setBackup), [])

  useEffect(() => {
    if (!recording) return
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      const captured = captureShortcutFromEvent(e)
      if (!captured) return
      saveNewEntryShortcut(captured)
      setNewEntryShortcut(captured)
      setRecording(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [recording])

  const handleResetShortcut = useCallback(() => {
    resetNewEntryShortcut()
    setNewEntryShortcut(DEFAULT_NEW_ENTRY_SHORTCUT)
    setRecording(false)
  }, [])

  const handleChooseBackup = useCallback(async () => {
    try {
      setError(null)
      await chooseBackupFolder()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message)
    }
  }, [])

  const handleRegrantBackup = useCallback(async () => {
    try {
      setError(null)
      await regrantBackupAccess()
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleBackupNow = useCallback(async () => {
    try {
      setError(null)
      await backupNow()
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleDisableBackup = useCallback(async () => {
    setError(null)
    await disableFileBackup()
  }, [])

  const handleSaveAI = useCallback(() => {
    saveAIConfig({ endpoint: endpoint.trim(), model: model.trim(), apiKey: apiKey.trim() })
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2000)
  }, [endpoint, model, apiKey])

  const handleExportJson = useCallback(async () => {
    try {
      const json = exportToJson()
      await saveFile(json, 'goroku-backup.json', 'application/json')
      setExportMsg('JSONエクスポート完了')
      setTimeout(() => setExportMsg(null), 3000)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleExportSqlite = useCallback(async () => {
    try {
      const bytes = exportToSqlite()
      await saveFile(bytes, 'goroku-backup.sqlite', 'application/x-sqlite3')
      setExportMsg('SQLiteエクスポート完了')
      setTimeout(() => setExportMsg(null), 3000)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleExportCsv = useCallback(async () => {
    try {
      const csvs = exportToCsv()
      await saveFile(csvs.vocabulary, 'goroku-単語.csv', 'text/csv')
      await saveFile(csvs.grammar, 'goroku-文型.csv', 'text/csv')
      await saveFile(csvs.phrase, 'goroku-慣用句.csv', 'text/csv')
      setExportMsg('CSVエクスポート完了（3ファイル）')
      setTimeout(() => setExportMsg(null), 3000)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const handleImport = useCallback(async () => {
    try {
      setError(null)
      setImportMsg(null)
      const file = await pickFile('.json,.sqlite')
      const name = file.name.toLowerCase()

      if (name.endsWith('.json')) {
        const text = await file.text()
        const result = importFromJson(text)
        setImportMsg(`インポート完了: ${result.entries}件のエントリー、${result.connections}件のつながり`)
      } else if (name.endsWith('.sqlite')) {
        const buffer = await file.arrayBuffer()
        const result = await importFromSqlite(buffer)
        setImportMsg(`インポート完了: ${result.entries}件のエントリー、${result.connections}件のつながり`)
      } else {
        setError('対応していないファイル形式です（.json または .sqlite）')
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-lg font-bold">設定</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">AI 接続</h3>
        <p className="text-xs text-gray-400">
          つながり提案に使用するLLM APIの設定（OpenAI互換形式）
        </p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500">APIエンドポイント</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">モデル名</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">APIキー</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAI}
              disabled={!endpoint.trim() || !model.trim() || !apiKey.trim()}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
            >
              保存
            </button>
            {aiSaved && (
              <span className="text-xs text-green-600">保存しました</span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">キーボードショートカット</h3>
        <p className="text-xs text-gray-400">
          スプレッドシート画面での「新規追加」に使うショートカットキーです。
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">新規追加:</span>
          {recording ? (
            <span className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
              キーを押してください…
            </span>
          ) : (
            <kbd className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
              {formatShortcut(newEntryShortcut)}
            </kbd>
          )}
          <button
            onClick={() => setRecording(true)}
            disabled={recording}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            変更
          </button>
          <button
            onClick={handleResetShortcut}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            デフォルトに戻す
          </button>
        </div>
        <p className="text-xs text-gray-400">
          ブラウザで開いている場合、ブラウザ自体のショートカットと衝突することがあります（デスクトップアプリでは衝突しません）。
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">自動バックアップ（フォルダ）</h3>
        <p className="text-xs text-gray-400">
          データは常に端末内（OPFS）に保存されます。さらに安全にするため、選んだフォルダ（iCloud
          Drive・Dropboxなど）に変更のたび <code>goroku.sqlite</code> を自動保存できます。
          ブラウザの仕様上、起動のたびにフォルダへのアクセスを再許可する必要があります。
        </p>

        {!isFileBackupSupported() ? (
          <p className="text-xs text-amber-600">
            このブラウザはフォルダ自動バックアップに対応していません（Chrome・Edge推奨）。エクスポートをご利用ください。
          </p>
        ) : backup.state === 'disabled' ? (
          <button
            onClick={handleChooseBackup}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            バックアップフォルダを選択
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">フォルダ:</span>
              <span className="font-medium text-gray-700">{('dirName' in backup && backup.dirName) || '—'}</span>
              {backup.state === 'active' && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">有効</span>
              )}
              {backup.state === 'needs-permission' && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">要再許可</span>
              )}
              {backup.state === 'error' && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">エラー</span>
              )}
            </div>

            {backup.state === 'active' && backup.lastBackupAt && (
              <p className="text-xs text-gray-400">
                最終バックアップ: {new Date(backup.lastBackupAt).toLocaleString('ja-JP')}
              </p>
            )}
            {backup.state === 'error' && (
              <p className="text-xs text-red-500">{backup.message}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {(backup.state === 'needs-permission' || backup.state === 'error') && (
                <button
                  onClick={handleRegrantBackup}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  アクセスを再許可
                </button>
              )}
              {backup.state === 'active' && (
                <button
                  onClick={handleBackupNow}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  今すぐバックアップ
                </button>
              )}
              <button
                onClick={handleChooseBackup}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                フォルダを変更
              </button>
              <button
                onClick={handleDisableBackup}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                無効にする
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">エクスポート</h3>
        <p className="text-xs text-gray-400">
          データをファイルに書き出します。iCloud DriveやDropboxに保存すると自動バックアップになります。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportSqlite}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            .sqlite
          </button>
          <button
            onClick={handleExportJson}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            .json
          </button>
          <button
            onClick={handleExportCsv}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            .csv（3ファイル）
          </button>
        </div>
        {exportMsg && (
          <p className="text-xs text-green-600">{exportMsg}</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">インポート</h3>
        <p className="text-xs text-gray-400">
          バックアップファイルから復元します。現在のデータは上書きされます。
        </p>
        <button
          onClick={handleImport}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ファイルを選択（.json / .sqlite）
        </button>
        {importMsg && (
          <p className="text-xs text-green-600">{importMsg}</p>
        )}
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-400 hover:text-red-600"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  )
}
