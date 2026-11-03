import type { Entry } from '../types/entry'
import { getAllEntries } from '../db/queries/entries'
import { connectionTypes } from '../config/connectionTypes'
import { entryTypeShortLabels } from '../config/entryTypes'
import { chatCompletion, getAIConfig } from './ai'
import { findSameKanjiMatches } from './sameKanjiDetector'

export interface ConnectionSuggestion {
  targetEntry: Entry
  type: string
  reasoning: string
  source: 'rule' | 'ai'
}

function buildPrompt(newEntry: Entry, candidates: Entry[]): string {
  const types = connectionTypes.filter((t) => t !== 'SAME_KANJI')
  const newEntryTypeLabel = entryTypeShortLabels[newEntry.type]

  const newEntryDesc = [
    `【新規${newEntryTypeLabel}】`,
    `語: ${newEntry.term}`,
    newEntry.reading ? `読み: ${newEntry.reading}` : null,
    `意味: ${newEntry.meanings.join('; ')}`,
    newEntry.partOfSpeech ? `品詞: ${newEntry.partOfSpeech}` : null,
    newEntry.notes ? `メモ: ${newEntry.notes}` : null,
  ].filter(Boolean).join('\n')

  // Each candidate's entry type is labeled so the model can reason about cross-type
  // relationships too (e.g. a vocabulary word that's a typical example of a grammar
  // pattern), not just within-type ones.
  const candidateList = candidates.map((c, i) =>
    `${i + 1}. [${entryTypeShortLabels[c.type]}] ${c.term}${c.reading ? ` (${c.reading})` : ''} — ${c.meanings.join('; ')}${c.partOfSpeech ? ` [${c.partOfSpeech}]` : ''}`
  ).join('\n')

  return `あなたは日本語学習の知識グラフを構築するアシスタントです。
このグラフには単語・文型・慣用句の3種類のノードがあり、つながりは同じ種類同士でも、異なる種類の間（例: 単語と文型）でも構いません。
新しく追加された${newEntryTypeLabel}と、既存の単語・文型・慣用句のリストを比較し、意味的・機能的なつながりを提案してください。

${newEntryDesc}

【既存の項目（種類付き）】
${candidateList}

【使用可能なつながりタイプ】
${types.map((t) => `- ${t}`).join('\n')}

つながりがあると思われるペアをJSON配列で返してください。各要素は以下の形式です:
{"index": <既存リストの番号>, "type": "<つながりタイプ>", "reasoning": "<日本語で1-2文の説明>"}

つながりがない場合は空配列 [] を返してください。最も関連性の高いものだけを提案し、無理につなげないでください。JSON配列のみを返し、他のテキストは含めないでください。`
}

function parseAIResponse(
  response: string,
  candidates: Entry[],
): ConnectionSuggestion[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number
      type: string
      reasoning: string
    }>
    return parsed
      .filter((item) => {
        const idx = item.index - 1
        return idx >= 0 && idx < candidates.length && item.type && item.reasoning
      })
      .map((item) => ({
        targetEntry: candidates[item.index - 1],
        type: item.type,
        reasoning: item.reasoning,
        source: 'ai' as const,
      }))
  } catch (e) {
    console.warn('Failed to parse AI suggestion response:', e, response)
    return []
  }
}

export interface GenerateSuggestionsResult {
  suggestions: ConnectionSuggestion[]
  // Set when the AI pass failed but rule-based (SAME_KANJI) suggestions could still be
  // returned. Surfaced by SuggestionPanel so a broken AI config doesn't look identical
  // to "no suggestions found" — previously this was only console.warn'd.
  aiError: string | null
}

export async function generateSuggestions(
  newEntry: Entry,
): Promise<GenerateSuggestionsResult> {
  const suggestions: ConnectionSuggestion[] = []
  let aiError: string | null = null

  // Rule-based: SAME_KANJI (vocabulary only)
  const kanjiMatches = findSameKanjiMatches(newEntry)
  for (const match of kanjiMatches) {
    suggestions.push({
      targetEntry: match.entry,
      type: 'SAME_KANJI',
      reasoning: `共通漢字: ${match.sharedKanji.join('、')}（異なる読み方）`,
      source: 'rule',
    })
  }

  // AI pass — candidate pool now spans all entry types (workstream 1: cross-type edges).
  const config = getAIConfig()
  if (config) {
    const candidates = getAllEntries().filter((e) => e.id !== newEntry.id)

    if (candidates.length > 0) {
      // Limit to 50 candidates to keep prompt size reasonable
      const limitedCandidates = candidates.slice(0, 50)
      const prompt = buildPrompt(newEntry, limitedCandidates)

      try {
        const response = await chatCompletion([
          { role: 'user', content: prompt },
        ])
        const aiSuggestions = parseAIResponse(response, limitedCandidates)
        suggestions.push(...aiSuggestions)
      } catch (err) {
        console.warn('AI suggestion failed:', err)
        aiError = (err as Error).message
      }
    }
  }

  // Sort: semantic suggestions first, SAME_KANJI last
  suggestions.sort((a, b) => {
    if (a.type === 'SAME_KANJI' && b.type !== 'SAME_KANJI') return 1
    if (a.type !== 'SAME_KANJI' && b.type === 'SAME_KANJI') return -1
    return 0
  })

  return { suggestions, aiError }
}
