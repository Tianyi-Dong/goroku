// Unified connection-type set, shared by every pair of entry types (workstream 1: the
// three per-type graphs and their separate type sets were merged into one graph with
// cross-type edges, so a single flat list replaces `connectionTypesByEntryType`).
export const connectionTypes = [
  'SAME_KANJI',
  'RELATED',
  'CONTRAST',
  'REGISTER_PAIRED',
  'OTHER',
] as const

export type ConnectionTypeKey = (typeof connectionTypes)[number]

export const connectionTypeLabels: Record<string, string> = {
  SAME_KANJI: '同漢字',
  RELATED: '類似',
  CONTRAST: '対比',
  REGISTER_PAIRED: '使用域',
  OTHER: 'その他',
}

export const connectionTypeColors: Record<string, string> = {
  SAME_KANJI: '#d97706',
  RELATED: '#3b82f6',
  CONTRAST: '#ef4444',
  REGISTER_PAIRED: '#a855f7',
  OTHER: '#9ca3af',
}

export function connectionTypeLabel(type: string): string {
  return connectionTypeLabels[type] ?? type
}

export function connectionTypeColor(type: string): string {
  return connectionTypeColors[type] ?? connectionTypeColors.OTHER
}
