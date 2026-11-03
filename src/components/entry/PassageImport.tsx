import { useState } from 'react'
import type { EntryType } from '../../types/entry'
import { parseEntryFromPassage, PASSAGE_MAX_LENGTH, type ParsedEntryFields } from '../../services/entryParser'

interface PassageImportProps {
  entryType: EntryType
  onParsed: (fields: ParsedEntryFields) => void
}

export default function PassageImport({ entryType, onParsed }: PassageImportProps) {
  const [passage, setPassage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleParse = async () => {
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      onParsed(await parseEntryFromPassage(passage, entryType))
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <details open className="rounded-md border border-gray-200 bg-gray-50">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
        文章から自動入力（AI）
      </summary>
      <div className="space-y-2 px-3 pb-3 pt-1">
        <textarea
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
          placeholder="語や文型を説明している文章を貼り付けてください"
          rows={5}
          maxLength={PASSAGE_MAX_LENGTH}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleParse}
            disabled={loading || passage.trim() === ''}
            className="shrink-0 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            {loading ? '解析中…' : '解析して入力'}
          </button>
          <span className="text-xs text-gray-400">
            下のフォームの入力内容は上書きされます。保存前に必ず確認してください。
          </span>
        </div>
        {error && <p className="text-sm text-red-600">解析に失敗しました: {error}</p>}
        {done && !error && (
          <p className="text-sm text-green-700">
            フォームに入力しました。内容を確認・修正してから保存してください。
          </p>
        )}
      </div>
    </details>
  )
}
