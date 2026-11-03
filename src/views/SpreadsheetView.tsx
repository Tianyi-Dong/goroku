import { useState, useEffect, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, type ColDef, type RowClickedEvent, ModuleRegistry } from 'ag-grid-community'
import type { Entry, EntryType } from '../types/entry'
import { getEntriesByType, createEntry, checkDuplicate } from '../db/queries/entries'
import type { CreateEntryInput, UpdateEntryInput } from '../db/queries/entries'
import { getNewEntryShortcut, matchesShortcut, formatShortcut } from '../services/keyboardShortcuts'
import { formatAttachmentRules } from '../utils/attachmentRules'
import Drawer from '../components/ui/Drawer'
import EntryForm from '../components/entry/EntryForm'
import EntryDetailDrawer from '../components/entry/EntryDetailDrawer'
import Toast from '../components/ui/Toast'

ModuleRegistry.registerModules([AllCommunityModule])

const tabs = [
  { key: 'vocabulary' as EntryType, label: '単語' },
  { key: 'grammar' as EntryType, label: '文型' },
  { key: 'phrase' as EntryType, label: '慣用句・ことわざ' },
] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP')
}

const vocabCols: ColDef<Entry>[] = [
  { field: 'term', headerName: '語彙', flex: 1.5 },
  { field: 'reading', headerName: '読み方', flex: 1 },
  { headerName: '意味', flex: 2, valueGetter: (p) => p.data?.meanings[0] ?? '' },
  { field: 'partOfSpeech', headerName: '品詞', width: 100 },
  { headerName: '使用域', width: 120, valueGetter: (p) => p.data?.register.join(', ') ?? '' },
  { headerName: '追加日', width: 110, valueGetter: (p) => p.data ? formatDate(p.data.createdAt) : '' },
]

const grammarCols: ColDef<Entry>[] = [
  { headerName: '接続ルール', flex: 2, valueGetter: (p) => formatAttachmentRules(p.data?.attachmentRules ?? null) },
  { field: 'term', headerName: 'パターン', flex: 1.5 },
  { headerName: '意味', flex: 2, valueGetter: (p) => p.data?.meanings[0] ?? '' },
  { headerName: '使用域', width: 120, valueGetter: (p) => p.data?.register.join(', ') ?? '' },
  { headerName: '追加日', width: 110, valueGetter: (p) => p.data ? formatDate(p.data.createdAt) : '' },
]

const phraseCols: ColDef<Entry>[] = [
  { field: 'term', headerName: '表現', flex: 1.5 },
  { field: 'reading', headerName: '読み方', flex: 1 },
  { headerName: '意味', flex: 2, valueGetter: (p) => p.data?.meanings[0] ?? '' },
  { headerName: '使用域', width: 120, valueGetter: (p) => p.data?.register.join(', ') ?? '' },
  { headerName: '追加日', width: 110, valueGetter: (p) => p.data ? formatDate(p.data.createdAt) : '' },
]

const colsByType: Record<EntryType, ColDef<Entry>[]> = {
  vocabulary: vocabCols,
  grammar: grammarCols,
  phrase: phraseCols,
}

export default function SpreadsheetView() {
  const [activeTab, setActiveTab] = useState<EntryType>('vocabulary')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const loadEntries = useCallback(() => {
    setEntries(getEntriesByType(activeTab))
  }, [activeTab])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (createOpen || detailOpen) return
      if (matchesShortcut(e, getNewEntryShortcut())) {
        e.preventDefault()
        setCreateOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createOpen, detailOpen])

  const handleRowClicked = useCallback((event: RowClickedEvent<Entry>) => {
    if (event.data) {
      setSelectedEntry(event.data)
      setDetailOpen(true)
    }
  }, [])

  const handleCreate = useCallback(
    (data: CreateEntryInput | UpdateEntryInput) => {
      setSaving(true)
      const input = data as CreateEntryInput
      const isDuplicate = checkDuplicate(input.type, input.term)
      if (isDuplicate) {
        setToast('この語彙はすでに登録されています')
      }
      const newEntry = createEntry(input)
      setSaving(false)
      setCreateOpen(false)
      loadEntries()
      setSelectedEntry(newEntry)
      setShowSuggestions(true)
      setDetailOpen(true)
    },
    [loadEntries],
  )

  const handleDetailUpdated = useCallback(() => {
    loadEntries()
    setDetailOpen(false)
    setSelectedEntry(null)
  }, [loadEntries])

  const columnDefs = useMemo(() => colsByType[activeTab], [activeTab])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setCreateOpen(true)}
          title={`ショートカット: ${formatShortcut(getNewEntryShortcut())}`}
          aria-label={`新規追加（ショートカット: ${formatShortcut(getNewEntryShortcut())}）`}
          className="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ＋ 新規追加
        </button>
      </div>

      <div className="h-[calc(100vh-160px)]">
        <AgGridReact<Entry>
          rowData={entries}
          columnDefs={columnDefs}
          onRowClicked={handleRowClicked}
          rowHeight={36}
          headerHeight={38}
          suppressCellFocus
          getRowId={(params) => params.data.id}
          overlayNoRowsTemplate='<span class="text-gray-400 text-sm">データがありません</span>'
        />
      </div>

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)}>
        <EntryForm
          entryType={activeTab}
          onSave={handleCreate}
          onCancel={() => setCreateOpen(false)}
          saving={saving}
        />
      </Drawer>

      <EntryDetailDrawer
        entry={selectedEntry}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedEntry(null)
          setShowSuggestions(false)
        }}
        onUpdated={handleDetailUpdated}
        showSuggestions={showSuggestions}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
