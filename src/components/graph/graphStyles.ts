import type { StylesheetJson } from 'cytoscape'
import { connectionTypeColor } from '../../config/connectionTypes'

export const getEdgeColor = connectionTypeColor

export const graphStylesheet: StylesheetJson = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      // Colored per entry type (単語/文型/慣用句) — see config/entryTypes.ts and
      // CytoscapeGraph's buildElements, which sets each node's `color` data field.
      'background-color': 'data(color)',
      color: '#fff',
      'font-size': '11px',
      width: 'label',
      height: '32px',
      padding: '8px',
      shape: 'round-rectangle',
      'text-max-width': '100px',
      'text-wrap': 'ellipsis',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'background-color': '#3b82f6',
      'border-width': 2,
      'border-color': '#1d4ed8',
    },
  },
  {
    selector: 'node.dimmed',
    style: {
      opacity: 0.15,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      opacity: 1,
    },
  },
  {
    selector: 'node.neighbor',
    style: {
      opacity: 1,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': 'data(color)',
      'curve-style': 'bezier',
      'target-arrow-shape': 'none',
      opacity: 0.7,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      opacity: 0.05,
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      opacity: 1,
      width: 3,
    },
  },
  {
    selector: 'edge:selected',
    style: {
      width: 3,
      opacity: 1,
    },
  },
]
