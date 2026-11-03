import { useRef, useEffect, useCallback, useState } from 'react'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import type { Core, EventObject, NodeSingular } from 'cytoscape'
import type { Entry, EntryType } from '../../types/entry'
import type { Connection } from '../../types/connection'
import { entryTypeColors } from '../../config/entryTypes'
import { graphStylesheet, getEdgeColor } from './graphStyles'

cytoscape.use(fcose)

interface CytoscapeGraphProps {
  entries: Entry[]
  connections: Connection[]
  hiddenConnectionTypes: Set<string>
  hiddenEntryTypes: Set<EntryType>
  onNodeClick: (entry: Entry) => void
  onEdgeClick: (connection: Connection, position: { x: number; y: number }) => void
  onBackgroundClick: () => void
  neighborhoodMode: boolean
}

// One shared graph now (workstream 1), so a single cache key instead of one per entry type.
const POSITION_CACHE_KEY = 'unified'
const savedPositions: Record<string, Record<string, { x: number; y: number }>> = {}

function nodeLabel(entry: Entry): string {
  if (entry.type === 'vocabulary' || entry.term.length <= 10) return entry.term
  return entry.term.slice(0, 10) + '…'
}

export default function CytoscapeGraph({
  entries,
  connections,
  hiddenConnectionTypes,
  hiddenEntryTypes,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
  neighborhoodMode,
}: CytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const entryMap = useRef<Map<string, Entry>>(new Map())
  const connMap = useRef<Map<string, Connection>>(new Map())

  useEffect(() => {
    entryMap.current = new Map(entries.map((e) => [e.id, e]))
    connMap.current = new Map(connections.map((c) => [c.id, c]))
  }, [entries, connections])

  const buildElements = useCallback(() => {
    const visibleEntries = entries.filter((e) => !hiddenEntryTypes.has(e.type))
    const visibleIds = new Set(visibleEntries.map((e) => e.id))

    const nodes = visibleEntries.map((e) => ({
      data: { id: e.id, label: nodeLabel(e), color: entryTypeColors[e.type] },
    }))

    // An edge whose endpoint was just hidden by the node-type filter must be dropped too,
    // or cytoscape throws trying to render an edge with a missing source/target.
    const visibleConns = connections.filter(
      (c) =>
        !hiddenConnectionTypes.has(c.type) &&
        visibleIds.has(c.sourceId) &&
        visibleIds.has(c.targetId),
    )
    const edges = visibleConns.map((c) => ({
      data: {
        id: c.id,
        source: c.sourceId,
        target: c.targetId,
        color: getEdgeColor(c.type),
        connectionType: c.type,
      },
    }))

    return { nodes, edges }
  }, [entries, connections, hiddenEntryTypes, hiddenConnectionTypes])

  const applyNeighborhood = useCallback(
    (cy: Core, nodeId: string | null) => {
      if (!neighborhoodMode || !nodeId) {
        cy.elements().removeClass('dimmed highlighted neighbor')
        return
      }

      const node = cy.getElementById(nodeId)
      if (node.empty()) {
        cy.elements().removeClass('dimmed highlighted neighbor')
        return
      }

      const neighborhood = node.neighborhood()
      cy.elements().addClass('dimmed').removeClass('highlighted neighbor')
      node.removeClass('dimmed').addClass('highlighted')
      neighborhood.removeClass('dimmed').addClass('neighbor')
      neighborhood.edges().removeClass('dimmed').addClass('highlighted')
    },
    [neighborhoodMode],
  )

  useEffect(() => {
    if (!containerRef.current) return

    const { nodes, edges } = buildElements()

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: graphStylesheet,
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    const cached = savedPositions[POSITION_CACHE_KEY]
    let hasPositions = false

    if (cached) {
      cy.nodes().forEach((n) => {
        const pos = cached[n.id()]
        if (pos) {
          n.position(pos)
          hasPositions = true
        }
      })
    }

    if (!hasPositions && nodes.length > 0) {
      cy.layout({
        name: 'fcose',
        animate: false,
        quality: 'proof',
        nodeDimensionsIncludeLabels: true,
        idealEdgeLength: 120,
        nodeRepulsion: 8000,
        gravity: 0.25,
      } as never).run()
    }

    // fcose's incremental constraint solver can leave a node styled hidden internally
    // when a layout run recomputes a smaller graph (e.g. after the node-type filter
    // removes a node) without ever explicitly re-showing everything; confirmed via
    // ele.visible() during debugging — a fcose/cytoscape quirk, not anything in this
    // component's own element data. Forcing visibility after layout is a safe no-op
    // when nothing was hidden, and fixes it when something was.
    cy.elements().style('display', 'element')

    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target as NodeSingular
      const entry = entryMap.current.get(node.id())
      if (entry) {
        setSelectedNodeId(node.id())
        onNodeClick(entry)
      }
    })

    cy.on('tap', 'edge', (evt: EventObject) => {
      const edge = evt.target
      const conn = connMap.current.get(edge.id())
      if (conn) {
        const renderedPos = edge.renderedMidpoint()
        onEdgeClick(conn, { x: renderedPos.x, y: renderedPos.y })
      }
    })

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNodeId(null)
        onBackgroundClick()
      }
    })

    cy.on('dragfree', 'node', () => {
      if (!savedPositions[POSITION_CACHE_KEY]) savedPositions[POSITION_CACHE_KEY] = {}
      cy.nodes().forEach((n) => {
        savedPositions[POSITION_CACHE_KEY][n.id()] = { ...n.position() }
      })
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
      cyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, connections, hiddenEntryTypes, hiddenConnectionTypes])

  useEffect(() => {
    if (cyRef.current) {
      applyNeighborhood(cyRef.current, selectedNodeId)
    }
  }, [selectedNodeId, neighborhoodMode, applyNeighborhood])

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg border border-gray-200 bg-white"
    />
  )
}
