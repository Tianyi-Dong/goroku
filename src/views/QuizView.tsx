import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import type { QuizQuestion } from '../services/quizEngine'
import { generateSession } from '../services/quizEngine'
import { createQuizSession, finalizeQuizSession, createQuizRecord } from '../db/queries/quiz'
import MultipleChoiceCard from '../components/quiz/MultipleChoiceCard'
import ExampleReviewCard from '../components/quiz/ExampleReviewCard'
import SessionSummary from '../components/quiz/SessionSummary'

type Phase = 'start' | 'active' | 'summary'

export default function QuizView() {
  const [phase, setPhase] = useState<Phase>('start')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleStart = useCallback(() => {
    const qs = generateSession(5)
    if (qs.length === 0) {
      setError('復習できるエントリーがありません。まず語彙や文型を追加してください。')
      return
    }
    const sid = uuid()
    createQuizSession(sid, qs.length)
    setQuestions(qs)
    setCurrentIndex(0)
    setScore(0)
    setSessionId(sid)
    setError(null)
    setPhase('active')
  }, [])

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const q = questions[currentIndex]
      createQuizRecord(sessionId, q.entry.id, q.format, correct)

      const newScore = correct ? score + 1 : score
      setScore(newScore)

      if (currentIndex + 1 >= questions.length) {
        finalizeQuizSession(sessionId, newScore)
        setPhase('summary')
      } else {
        setCurrentIndex(currentIndex + 1)
      }
    },
    [questions, currentIndex, sessionId, score],
  )

  const handleRestart = useCallback(() => {
    setPhase('start')
  }, [])

  if (phase === 'start') {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-lg text-gray-500">復習セッション</p>
        <p className="text-sm text-gray-400">5問ランダム出題</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleStart}
          className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          開始
        </button>
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <div className="py-12">
        <SessionSummary
          score={score}
          total={questions.length}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  const q = questions[currentIndex]

  return (
    <div className="py-8">
      {q.format === 'example_review' ? (
        <ExampleReviewCard
          key={currentIndex}
          question={q}
          questionNumber={currentIndex + 1}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      ) : (
        <MultipleChoiceCard
          key={currentIndex}
          question={q}
          questionNumber={currentIndex + 1}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}
