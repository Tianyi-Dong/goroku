import type { Entry } from '../types/entry'
import { getEntriesByType } from '../db/queries/entries'
import { getConnectedIds } from '../db/queries/connections'

const KANJI_RANGE = /[一-龯㐀-䶿]/g

function extractKanji(text: string): Set<string> {
  return new Set(text.match(KANJI_RANGE) ?? [])
}

export interface SameKanjiMatch {
  entry: Entry
  sharedKanji: string[]
}

export function findSameKanjiMatches(newEntry: Entry): SameKanjiMatch[] {
  if (newEntry.type !== 'vocabulary') return []

  const newKanji = extractKanji(newEntry.term)
  if (newKanji.size === 0) return []

  const allVocab = getEntriesByType('vocabulary')
  // One query for every already-connected id, instead of one connectionExists query per
  // candidate below.
  const alreadyConnected = getConnectedIds(newEntry.id, 'SAME_KANJI')
  const matches: SameKanjiMatch[] = []

  for (const existing of allVocab) {
    if (existing.id === newEntry.id) continue
    if (alreadyConnected.has(existing.id)) continue

    const existingKanji = extractKanji(existing.term)
    const shared = [...newKanji].filter((k) => existingKanji.has(k))
    if (shared.length === 0) continue

    // Only match if the entries have different readings.
    // If either has no reading, skip (we can't verify different readings).
    if (!newEntry.reading || !existing.reading) continue
    if (newEntry.reading === existing.reading) continue

    matches.push({ entry: existing, sharedKanji: shared })
  }

  return matches
}
