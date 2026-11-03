import { useState, useRef, useEffect, useCallback } from 'react'
import type { Entry } from '../../types/entry'
import { searchByTerm, searchFullText } from '../../db/queries/search'
import { entryTypeShortLabels } from '../../config/entryTypes'

type SearchMode = 'term' | 'fulltext'

interface SearchBarProps {
  onSelectEntry: (entry: Entry) => void
}

export default function SearchBar({ onSelectEntry }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('term')
  const [results, setResults] = useState<Entry[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const runSearch = useCallback(
    (q: string) => {
      if (q.trim().length === 0) {
        setResults([])
        setOpen(false)
        return
      }
      const hits = mode === 'term' ? searchByTerm(q) : searchFullText(q)
      setResults(hits)
      setOpen(hits.length > 0)
      setActiveIndex(-1)
    },
    [mode],
  )

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 150)
  }

  const handleSelect = (entry: Entry) => {
    onSelectEntry(entry)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const toggleMode = () => {
    const next = mode === 'term' ? 'fulltext' : 'term'
    setMode(next)
    if (query.trim()) {
      const hits = next === 'term' ? searchByTerm(query) : searchFullText(query)
      setResults(hits)
      setOpen(hits.length > 0)
      setActiveIndex(-1)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleMode}
          className="shrink-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          title={mode === 'term' ? '語彙検索モード' : '全文検索モード'}
        >
          {mode === 'term' ? '語彙' : '全文'}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'term' ? '語彙検索…' : '全文検索…'}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleSelect(entry)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                {entryTypeShortLabels[entry.type]}
              </span>
              <span className="flex-1 truncate">
                <span className="font-medium">{entry.term}</span>
                <span className="ml-2 text-gray-400">{entry.meanings[0]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
