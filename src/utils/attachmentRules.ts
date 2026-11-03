import type { AttachmentRules } from '../types/entry'

export function formatAttachmentRules(rules: AttachmentRules | null): string {
  if (!rules) return ''
  const parts: string[] = []
  if (rules.verb?.length) parts.push(...rules.verb.map((f) => `V${f}`))
  if (rules.noun?.length) parts.push(...rules.noun.map((f) => f))
  if (rules.iAdj?.length) parts.push(...rules.iAdj.map((f) => `イA${f}`))
  if (rules.naAdj?.length) parts.push(...rules.naAdj.map((f) => `ナA${f}`))
  if (rules.other) parts.push(rules.other)
  return parts.join(' / ')
}
