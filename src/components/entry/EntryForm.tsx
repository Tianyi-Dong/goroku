import { useState, useCallback } from 'react'
import type { Entry, EntryType, AttachmentRules, ExampleSentence } from '../../types/entry'
import type { CreateEntryInput, UpdateEntryInput } from '../../db/queries/entries'
import { entryTypeLabels } from '../../config/entryTypes'
import type { ParsedEntryFields } from '../../services/entryParser'
import PassageImport from './PassageImport'
import MeaningsList from './MeaningsList'
import ExamplesList from './ExamplesList'
import VocabularyFields from './VocabularyFields'
import GrammarFields from './GrammarFields'
import PhraseFields from './PhraseFields'

interface EntryFormProps {
  entryType: EntryType
  initial?: Entry | null
  onSave: (data: CreateEntryInput | UpdateEntryInput) => void
  onCancel: () => void
  saving?: boolean
}

const termLabels: Record<EntryType, string> = {
  vocabulary: '語彙',
  grammar: 'パターン',
  phrase: '表現',
}

const termPlaceholders: Record<EntryType, string> = {
  vocabulary: '例：勉強',
  grammar: '例：〜に際して',
  phrase: '例：猫の手も借りたい',
}

export default function EntryForm({ entryType, initial, onSave, onCancel, saving }: EntryFormProps) {
  const isEdit = !!initial

  const [term, setTerm] = useState(initial?.term ?? '')
  const [reading, setReading] = useState(initial?.reading ?? '')
  const [meanings, setMeanings] = useState<string[]>(initial?.meanings ?? [''])
  const [partOfSpeech, setPartOfSpeech] = useState(initial?.partOfSpeech ?? '')
  const [register, setRegister] = useState<string[]>(initial?.register ?? [])
  const [attachmentRules, setAttachmentRules] = useState<AttachmentRules>(
    initial?.attachmentRules ?? {},
  )
  const [usageContext, setUsageContext] = useState(initial?.usageContext ?? '')
  const [examples, setExamples] = useState<ExampleSentence[]>(initial?.examples ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // Overwrites every field: a parse result always carries all fields (empty when the
  // passage had nothing), so re-running with a different passage fully replaces the last one.
  const applyParsed = useCallback((p: ParsedEntryFields) => {
    setTerm(p.term)
    setReading(p.reading)
    setMeanings(p.meanings.length ? p.meanings : [''])
    setPartOfSpeech(p.partOfSpeech)
    setRegister(p.register)
    setAttachmentRules(p.attachmentRules)
    setUsageContext(p.usageContext)
    setExamples(p.examples)
    setNotes(p.notes)
  }, [])

  const canSubmit =
    term.trim() !== '' &&
    meanings.some((m) => m.trim() !== '') &&
    (entryType !== 'vocabulary' || partOfSpeech !== '')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      const filteredMeanings = meanings.filter((m) => m.trim() !== '')
      const filteredExamples = examples
        .filter((ex) => ex.japanese.trim() !== '' || ex.translation.trim() !== '')
        .map((ex) => ({
          japanese: ex.japanese.trim(),
          translation: ex.translation.trim(),
          ...(ex.source?.trim() ? { source: ex.source.trim() } : {}),
        }))

      if (isEdit) {
        const data: UpdateEntryInput = {
          term: term.trim(),
          meanings: filteredMeanings,
          notes: notes.trim() || null,
          examples: filteredExamples,
          register,
        }
        if (entryType === 'vocabulary') {
          data.reading = reading.trim() || null
          data.partOfSpeech = partOfSpeech || null
        }
        if (entryType === 'grammar') {
          data.attachmentRules = attachmentRules
        }
        if (entryType === 'phrase') {
          data.reading = reading.trim() || null
          data.usageContext = usageContext.trim() || null
        }
        onSave(data)
      } else {
        const data: CreateEntryInput = {
          type: entryType,
          term: term.trim(),
          meanings: filteredMeanings,
          reading: reading.trim() || null,
          partOfSpeech: entryType === 'vocabulary' ? partOfSpeech || null : null,
          register,
          attachmentRules: entryType === 'grammar' ? attachmentRules : null,
          usageContext: entryType === 'phrase' ? usageContext.trim() || null : null,
          examples: filteredExamples,
          notes: notes.trim() || null,
        }
        onSave(data)
      }
    },
    [
      canSubmit, isEdit, term, meanings, notes, examples, register,
      reading, partOfSpeech, attachmentRules, usageContext, entryType, onSave,
    ],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-bold">
        {isEdit ? `${entryTypeLabels[entryType]}を編集` : `${entryTypeLabels[entryType]}を追加`}
      </h2>

      {!isEdit && <PassageImport entryType={entryType} onParsed={applyParsed} />}

      <div>
        <label className="text-sm font-medium text-gray-700">{termLabels[entryType]} *</label>
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={termPlaceholders[entryType]}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          autoFocus
        />
      </div>

      {entryType === 'vocabulary' && (
        <VocabularyFields
          reading={reading}
          partOfSpeech={partOfSpeech}
          register={register}
          onReadingChange={setReading}
          onPartOfSpeechChange={setPartOfSpeech}
          onRegisterChange={setRegister}
        />
      )}

      {entryType === 'grammar' && (
        <GrammarFields
          attachmentRules={attachmentRules}
          register={register}
          onAttachmentRulesChange={setAttachmentRules}
          onRegisterChange={setRegister}
        />
      )}

      {entryType === 'phrase' && (
        <PhraseFields
          reading={reading}
          usageContext={usageContext}
          register={register}
          onReadingChange={setReading}
          onUsageContextChange={setUsageContext}
          onRegisterChange={setRegister}
        />
      )}

      <MeaningsList meanings={meanings} onChange={setMeanings} />
      <ExamplesList examples={examples} onChange={setExamples} />

      <div>
        <label className="text-sm font-medium text-gray-700">メモ</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ニュアンス、注意点など"
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
