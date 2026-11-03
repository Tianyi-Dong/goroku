import { type ReactNode, useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function Drawer({ open, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[560px] overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        <div className="p-6">{children}</div>
      </div>
    </>
  )
}
