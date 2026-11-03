export interface ShortcutBinding {
  key: string // event.key, lowercased (e.g. 'n')
  mod: boolean // Cmd on Mac, Ctrl elsewhere
  shift: boolean
  alt: boolean
}

const STORAGE_KEY = 'goroku-shortcut-new-entry'

export const DEFAULT_NEW_ENTRY_SHORTCUT: ShortcutBinding = {
  key: 'n',
  mod: true,
  shift: false,
  alt: false,
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
}

export function getNewEntryShortcut(): ShortcutBinding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_NEW_ENTRY_SHORTCUT
    return { ...DEFAULT_NEW_ENTRY_SHORTCUT, ...(JSON.parse(raw) as Partial<ShortcutBinding>) }
  } catch {
    return DEFAULT_NEW_ENTRY_SHORTCUT
  }
}

export function saveNewEntryShortcut(binding: ShortcutBinding): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(binding))
}

export function resetNewEntryShortcut(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Ignore bare modifier keypresses when recording a new binding. */
const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Shift', 'Alt'])

export function captureShortcutFromEvent(e: KeyboardEvent): ShortcutBinding | null {
  if (MODIFIER_KEYS.has(e.key)) return null
  return {
    key: e.key.toLowerCase(),
    mod: isMac() ? e.metaKey : e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  }
}

export function matchesShortcut(e: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false
  const modPressed = isMac() ? e.metaKey : e.ctrlKey
  const otherPlatformModPressed = isMac() ? e.ctrlKey : e.metaKey
  if (modPressed !== binding.mod) return false
  if (otherPlatformModPressed) return false
  if (e.shiftKey !== binding.shift) return false
  if (e.altKey !== binding.alt) return false
  return true
}

export function formatShortcut(binding: ShortcutBinding): string {
  const mac = isMac()
  const parts: string[] = []
  if (binding.mod) parts.push(mac ? '⌘' : 'Ctrl')
  if (binding.shift) parts.push(mac ? '⇧' : 'Shift')
  if (binding.alt) parts.push(mac ? '⌥' : 'Alt')
  parts.push(binding.key.length === 1 ? binding.key.toUpperCase() : binding.key)
  return parts.join(mac ? '' : '+')
}
