import { useState, useCallback, useEffect } from 'react'
import type { Entry, EntryType } from '../types/entry'
import type { Connection } from '../types/connection'
import { getAllEntries } from '../db/queries/entries'
import { getAllConnections } from '../db/queries/connections'
import { connectionTypes } from '../config/connectionTypes'
import CytoscapeGraph from '../components/graph/CytoscapeGraph'
import GraphFilter from '../components/graph/GraphFilter'
import NodeTypeFilter from '../components/graph/NodeTypeFilter'
import GraphLegend from '../components/graph/GraphLegend'
import EdgePopover from '../components/graph/EdgePopover'
import EntryDetailDrawer from '../components/entry/EntryDetailDrawer'

export default function GraphView() {
  const [neighborhoodMode, setNeighborhoodMode] = useState(true)
  const [hiddenConnectionTypes, setHiddenConnectionTypes] = useState<Set<string>>(new Set())
  const [hiddenEntryTypes, setHiddenEntryTypes] = useState<Set<EntryType>>(new Set())
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [edgePopover, setEdgePopover] = useState<{
    connection: Connection
    position: { x: number; y: number }
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Loaded into state (not read directly in the render body) so a re-render triggered by
  // something else — e.g. toggling neighborhoodMode — doesn't re-scan and re-parse the
  // whole graph every time; only refreshKey / mount re-fetches.
  const [entries, setEntries] = useState<Entry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])

  useEffect(() => {
    setEntries(getAllEntries())
    setConnections(getAllConnections())
  }, [refreshKey])

  const handleNodeClick = useCallback((entry: Entry) => {
    setSelectedEntry(entry)
    setDrawerOpen(true)
    setEdgePopover(null)
  }, [])

  const handleEdgeClick = useCallback(
    (connection: Connection, position: { x: number; y: number }) => {
      setEdgePopover({ connection, position })
    },
    [],
  )

  const handleBackgroundClick = useCallback(() => {
    setEdgePopover(null)
  }, [])

  const handleConnectionFilterToggle = useCallback((type: string) => {
    setHiddenConnectionTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleEntryFilterToggle = useCallback((type: EntryType) => {
    setHiddenEntryTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const handleConnectionsChanged = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setEdgePopover(null)
  }, [])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <NodeTypeFilter hiddenTypes={hiddenEntryTypes} onToggle={handleEntryFilterToggle} />

        <button
          onClick={() => setNeighborhoodMode(!neighborhoodMode)}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            neighborhoodMode
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border-blue-300 bg-blue-50 text-blue-700'
          }`}
        >
          {neighborhoodMode ? '全体表示' : '近傍モード'}
        </button>
      </div>

      <div className="mb-3">
        <GraphFilter
          types={connectionTypes}
          hiddenTypes={hiddenConnectionTypes}
          onToggle={handleConnectionFilterToggle}
        />
      </div>

      {entries.length === 0 ? (
        <div className="flex h-[calc(100vh-220px)] items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
          データがありません
        </div>
      ) : (
        <div className="relative h-[calc(100vh-220px)]">
          <CytoscapeGraph
            key={refreshKey}
            entries={entries}
            connections={connections}
            hiddenConnectionTypes={hiddenConnectionTypes}
            hiddenEntryTypes={hiddenEntryTypes}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onBackgroundClick={handleBackgroundClick}
            neighborhoodMode={neighborhoodMode}
          />
          <GraphLegend types={connectionTypes} />

          {edgePopover && (
            <EdgePopover
              connection={edgePopover.connection}
              position={edgePopover.position}
              onClose={() => setEdgePopover(null)}
              onChanged={handleConnectionsChanged}
            />
          )}
        </div>
      )}

      <EntryDetailDrawer
        entry={selectedEntry}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedEntry(null)
        }}
        onUpdated={() => {
          setRefreshKey((k) => k + 1)
        }}
        onConnectionsChanged={handleConnectionsChanged}
      />
    </div>
  )
}
