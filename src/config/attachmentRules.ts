import type { VerbForm, NounForm, IAdjForm, NaAdjForm } from '../types/entry'

export const verbForms: readonly VerbForm[] = [
  '辞書形', 'ます形', 'て形', 'た形', 'ない形', 'ず形',
  '意向形', '条件形・ば形', '命令形', '可能形', '受身形', '使役形',
]

export const nounForms: readonly NounForm[] = [
  'N', 'N＋の', 'N＋に', 'N＋を', 'N＋が',
  'N＋で', 'N＋である', 'N＋から', 'N＋と',
]

export const iAdjForms: readonly IAdjForm[] = [
  '普通形（〜い）', '語幹（〜く）', 'て形（〜くて）',
]

export const naAdjForms: readonly NaAdjForm[] = [
  '語幹', '〜な', '〜に', '〜で', '〜である', '〜だ',
]
