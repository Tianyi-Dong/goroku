import type { Entry } from '../types/entry'
import type { QuizFormat } from '../types/quiz'
import { getEntryById, getAllEntries } from '../db/queries/entries'
import { getPriorityQueue } from '../db/queries/quiz'

export interface QuizQuestion {
  entry: Entry
  format: QuizFormat
  prompt: string
  choices?: string[]
  correctIndex?: number
  exampleJapanese?: string
  exampleTranslation?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(correct: string, pool: string[], count: number): string[] {
  const filtered = pool.filter((s) => s !== correct)
  return shuffle(filtered).slice(0, count)
}

function pickFormat(entry: Entry): QuizFormat {
  const hasExamples = entry.examples.length > 0
  const formats: QuizFormat[] = ['term_to_meaning', 'meaning_to_term']
  if (hasExamples) formats.push('example_review')

  return formats[Math.floor(Math.random() * formats.length)]
}

function buildTermToMeaning(entry: Entry, allEntries: Entry[]): QuizQuestion {
  const correctMeaning = entry.meanings[0]
  const meaningPool = allEntries
    .filter((e) => e.type === entry.type && e.id !== entry.id)
    .map((e) => e.meanings[0])
  const distractors = pickDistractors(correctMeaning, meaningPool, 3)

  const allChoices = shuffle([correctMeaning, ...distractors])

  return {
    entry,
    format: 'term_to_meaning',
    prompt: entry.term,
    choices: allChoices,
    correctIndex: allChoices.indexOf(correctMeaning),
  }
}

function buildMeaningToTerm(entry: Entry, allEntries: Entry[]): QuizQuestion {
  const correctTerm = entry.term
  const termPool = allEntries
    .filter((e) => e.type === entry.type && e.id !== entry.id)
    .map((e) => e.term)
  const distractors = pickDistractors(correctTerm, termPool, 3)

  const allChoices = shuffle([correctTerm, ...distractors])

  return {
    entry,
    format: 'meaning_to_term',
    prompt: entry.meanings[0],
    choices: allChoices,
    correctIndex: allChoices.indexOf(correctTerm),
  }
}

function buildExampleReview(entry: Entry): QuizQuestion {
  const ex = entry.examples[Math.floor(Math.random() * entry.examples.length)]
  return {
    entry,
    format: 'example_review',
    prompt: entry.term,
    exampleJapanese: ex.japanese,
    exampleTranslation: ex.translation,
  }
}

export function generateSession(size: number = 5): QuizQuestion[] {
  const priorityEntries = getPriorityQueue(size * 3)
  const allEntries = getAllEntries()

  if (allEntries.length < 2) return []

  const selected: Entry[] = []
  const usedIds = new Set<string>()

  for (const pe of priorityEntries) {
    if (selected.length >= size) break
    const entry = getEntryById(pe.id)
    if (entry && !usedIds.has(entry.id)) {
      selected.push(entry)
      usedIds.add(entry.id)
    }
  }

  if (selected.length === 0) return []

  return selected.map((entry) => {
    const format = pickFormat(entry)

    switch (format) {
      case 'term_to_meaning':
        return buildTermToMeaning(entry, allEntries)
      case 'meaning_to_term':
        return buildMeaningToTerm(entry, allEntries)
      case 'example_review':
        return buildExampleReview(entry)
    }
  })
}
