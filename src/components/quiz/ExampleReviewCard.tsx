import { useState } from 'react'
import type { QuizQuestion } from '../../services/quizEngine'

interface ExampleReviewCardProps {
  question: QuizQuestion
  questionNumber: number
  total: number
  onAnswer: (correct: boolean) => void
}

export default function ExampleReviewCard({
  question,
  questionNumber,
  total,
  onAnswer,
}: ExampleReviewCardProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>例文確認</span>
        <span>
          {questionNumber} / {total}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <p className="mb-1 text-xs text-gray-400">{question.prompt}</p>
        <p className="text-lg">{question.exampleJapanese}</p>

        {revealed ? (
          <p className="mt-3 border-t border-gray-200 pt-3 text-sm text-gray-600">
            {question.exampleTranslation}
          </p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            訳を表示
          </button>
        )}
      </div>

      {revealed && (
        <div className="flex gap-3">
          <button
            onClick={() => onAnswer(true)}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            理解
          </button>
          <button
            onClick={() => onAnswer(false)}
            className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            未理解
          </button>
        </div>
      )}
    </div>
  )
}
