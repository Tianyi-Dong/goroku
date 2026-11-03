import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export default function Toast({ message, onDone, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  )
}
