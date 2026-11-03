export type EntryType = 'vocabulary' | 'grammar' | 'phrase'

export interface Entry {
  id: string
  type: EntryType
  term: string
  reading: string | null
  meanings: string[]
  partOfSpeech: string | null
  register: string[]
  attachmentRules: AttachmentRules | null
  usageContext: string | null
  examples: ExampleSentence[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ExampleSentence {
  japanese: string
  translation: string
  source?: string // optional; rendered as a clickable link when it's a URL
}

export interface AttachmentRules {
  verb?: VerbForm[]
  noun?: NounForm[]
  iAdj?: IAdjForm[]
  naAdj?: NaAdjForm[]
  other?: string // free text; a fifth preceding-element type alongside verb/noun/iAdj/naAdj
}

export type VerbForm =
  | '辞書形'
  | 'ます形'
  | 'て形'
  | 'た形'
  | 'ない形'
  | 'ず形'
  | '意向形'
  | '条件形・ば形'
  | '命令形'
  | '可能形'
  | '受身形'
  | '使役形'

export type NounForm =
  | 'N'
  | 'N＋の'
  | 'N＋に'
  | 'N＋を'
  | 'N＋が'
  | 'N＋で'
  | 'N＋である'
  | 'N＋から'
  | 'N＋と'

export type IAdjForm =
  | '普通形（〜い）'
  | '語幹（〜く）'
  | 'て形（〜くて）'

export type NaAdjForm =
  | '語幹'
  | '〜な'
  | '〜に'
  | '〜で'
  | '〜である'
  | '〜だ'
