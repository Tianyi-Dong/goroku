interface SessionSummaryProps {
  score: number
  total: number
  onRestart: () => void
}

export default function SessionSummary({ score, total, onRestart }: SessionSummaryProps) {
  const percent = Math.round((score / total) * 100)

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      <h2 className="text-lg font-semibold text-gray-800">セッション完了</h2>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
        <p className="text-5xl font-bold text-gray-900">
          {score}
          <span className="text-2xl text-gray-400"> / {total}</span>
        </p>
        <p className="mt-2 text-sm text-gray-500">{percent}% 正解</p>
      </div>

      <button
        onClick={onRestart}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        もう一度
      </button>
    </div>
  )
}
