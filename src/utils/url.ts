export function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim())
}
