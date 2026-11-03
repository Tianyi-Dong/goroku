import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Entry } from './types/entry'
import AppShell from './components/layout/AppShell'
import EntryDetailDrawer from './components/entry/EntryDetailDrawer'
import SpreadsheetView from './views/SpreadsheetView'
import GraphView from './views/GraphView'
import QuizView from './views/QuizView'
import SettingsView from './views/SettingsView'

export default function App() {
  const [searchEntry, setSearchEntry] = useState<Entry | null>(null)
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false)

  const handleSearchSelect = useCallback((entry: Entry) => {
    setSearchEntry(entry)
    setSearchDrawerOpen(true)
  }, [])

  const handleSearchDrawerClose = useCallback(() => {
    setSearchDrawerOpen(false)
    setSearchEntry(null)
  }, [])

  return (
    <AppShell onSearchSelect={handleSearchSelect}>
      <Routes>
        <Route path="/" element={<Navigate to="/spreadsheet" replace />} />
        <Route path="/spreadsheet" element={<SpreadsheetView />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/quiz" element={<QuizView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>

      <EntryDetailDrawer
        entry={searchEntry}
        open={searchDrawerOpen}
        onClose={handleSearchDrawerClose}
        onUpdated={handleSearchDrawerClose}
      />
    </AppShell>
  )
}
