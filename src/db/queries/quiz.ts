import { v4 as uuid } from 'uuid'
import { getAll, getOne, run } from '../database'
import type { QuizFormat, QuizRecord, QuizSession } from '../../types/quiz'

interface QuizSessionRow {
  id: string
  score: number
  total: number
  completed_at: string
}

function rowToSession(row: QuizSessionRow): QuizSession {
  return {
    id: row.id,
    score: row.score,
    total: row.total,
    completedAt: row.completed_at,
  }
}

export function createQuizSession(id: string, total: number): QuizSession {
  run(
    'INSERT INTO quiz_sessions (id, score, total, completed_at) VALUES (?, ?, ?, ?)',
    [id, 0, total, new Date().toISOString()],
  )
  return getQuizSessionById(id)!
}

export function finalizeQuizSession(id: string, score: number): void {
  run(
    'UPDATE quiz_sessions SET score = ?, completed_at = ? WHERE id = ?',
    [score, new Date().toISOString(), id],
  )
}

export function getQuizSessionById(id: string): QuizSession | null {
  const row = getOne<QuizSessionRow>('SELECT * FROM quiz_sessions WHERE id = ?', [id])
  return row ? rowToSession(row) : null
}

export function createQuizRecord(
  sessionId: string,
  entryId: string,
  format: QuizFormat,
  correct: boolean,
): QuizRecord {
  const id = uuid()
  run(
    'INSERT INTO quiz_records (id, entry_id, session_id, format, correct, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, entryId, sessionId, format, correct ? 1 : 0, new Date().toISOString()],
  )
  return { id, entryId, sessionId, format, correct, reviewedAt: new Date().toISOString() }
}

export interface EntryPerformance {
  totalAttempts: number
  correctCount: number
  percentCorrect: number
  lastReviewedAt: string | null
}

export function getEntryPerformance(entryId: string): EntryPerformance {
  const row = getOne<{ total: number; correct: number; last_reviewed: string | null }>(
    `SELECT COUNT(*) as total, SUM(correct) as correct, MAX(reviewed_at) as last_reviewed
     FROM quiz_records WHERE entry_id = ?`,
    [entryId],
  )
  const total = row?.total ?? 0
  const correct = row?.correct ?? 0
  return {
    totalAttempts: total,
    correctCount: correct,
    percentCorrect: total > 0 ? Math.round((correct / total) * 100) : 0,
    lastReviewedAt: row?.last_reviewed ?? null,
  }
}

export interface PriorityEntry {
  id: string
  priority: number
}

export function getPriorityQueue(limit: number): PriorityEntry[] {
  const rows = getAll<{ id: string; priority: number }>(
    `SELECT
       e.id,
       (COALESCE(json_array_length(e.examples), 0) * 2) +
       MAX(0, 30 - CAST(julianday('now') - julianday(e.created_at) AS INTEGER))
       AS priority
     FROM entries e
     ORDER BY priority DESC
     LIMIT ?`,
    [limit],
  )
  return rows
}
