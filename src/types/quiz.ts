export type QuizFormat = 'term_to_meaning' | 'meaning_to_term' | 'example_review'

export interface QuizRecord {
  id: string
  entryId: string
  sessionId: string
  format: QuizFormat
  correct: boolean
  reviewedAt: string
}

export interface QuizSession {
  id: string
  score: number
  total: number
  completedAt: string
}
