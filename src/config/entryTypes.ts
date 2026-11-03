import type { EntryType } from '../types/entry'

export const entryTypeLabels: Record<EntryType, string> = {
  vocabulary: '単語',
  grammar: '文型',
  phrase: '慣用句・ことわざ',
}

// Short form, used where space is tight (search results, graph legend).
export const entryTypeShortLabels: Record<EntryType, string> = {
  vocabulary: '単語',
  grammar: '文型',
  phrase: '慣用句',
}

// Node color per entry type in the unified graph (workstream 1).
export const entryTypeColors: Record<EntryType, string> = {
  vocabulary: '#1f2937',
  grammar: '#0f766e',
  phrase: '#7c3aed',
}
