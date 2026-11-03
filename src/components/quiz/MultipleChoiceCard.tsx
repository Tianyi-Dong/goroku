import { useState } from 'react'
import type { QuizQuestion } from '../../services/quizEngine'

interface MultipleChoiceCardProps {
  question: QuizQuestion
  questionNumber: number
  total: number
  onAnswer: (correct: boolean) => void
}

export default function MultipleChoiceCard({
  question,
  questionNumber,
  total,
  onAnswer,
}: MultipleChoiceCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const answered = selected !== null
  const isCorrect = selected === question.correctIndex

  const formatLabel =
    question.format === 'term_to_meaning'
      ? '語彙 → 意味'
      : '意味 → 語彙'

  const handleSelect = (index: number) => {
    if (answered) return
    setSelected(index)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatLabel}</span>
        <span>
          {questionNumber} / {total}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-2xl font-bold">{question.prompt}</p>
      </div>

      <div className="space-y-2">
        {question.choices!.map((choice, i) => {
          let style = 'border-gray-200 hover:bg-gray-50'
          if (answered) {
            if (i === question.correctIndex) {
              style = 'border-green-300 bg-green-50 text-green-800'
            } else if (i === selected) {
              style = 'border-red-300 bg-red-50 text-red-800'
            } else {
              style = 'border-gray-100 text-gray-400'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="space-y-3">
          <p className={`text-center text-sm font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {isCorrect ? '正解！' : '不正解'}
          </p>
          <button
            onClick={() => onAnswer(isCorrect)}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}
