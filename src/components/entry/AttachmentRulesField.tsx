import type { AttachmentRules } from '../../types/entry'
import { verbForms, nounForms, iAdjForms, naAdjForms } from '../../config/attachmentRules'

interface AttachmentRulesFieldProps {
  rules: AttachmentRules
  onChange: (rules: AttachmentRules) => void
}

type SectionKey = 'verb' | 'noun' | 'iAdj' | 'naAdj'

const sections: { key: SectionKey; label: string; options: readonly string[] }[] = [
  { key: 'verb', label: '動詞', options: verbForms },
  { key: 'noun', label: '名詞', options: nounForms },
  { key: 'iAdj', label: 'い形容詞', options: iAdjForms },
  { key: 'naAdj', label: 'な形容詞・名詞＋コピュラ', options: naAdjForms },
]

export default function AttachmentRulesField({ rules, onChange }: AttachmentRulesFieldProps) {
  const toggle = (sectionKey: SectionKey, form: string, checked: boolean) => {
    const current = (rules[sectionKey] as string[] | undefined) ?? []
    const next = checked
      ? [...current, form]
      : current.filter((f) => f !== form)
    onChange({ ...rules, [sectionKey]: next.length ? next : undefined })
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">接続ルール</label>
      {sections.map(({ key, label, options }) => (
        <details key={key} className="rounded-md border border-gray-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {label}
            {(rules[key] as string[] | undefined)?.length
              ? ` (${(rules[key] as string[]).length})`
              : ''}
          </summary>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-3 pt-1">
            {options.map((form) => (
              <label key={form} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={((rules[key] as string[] | undefined) ?? []).includes(form)}
                  onChange={(e) => toggle(key, form, e.target.checked)}
                  className="rounded border-gray-300"
                />
                {form}
              </label>
            ))}
          </div>
        </details>
      ))}

      <details className="rounded-md border border-gray-200">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          その他{rules.other ? ' (1)' : ''}
        </summary>
        <div className="px-3 pb-3 pt-1">
          <input
            type="text"
            value={rules.other ?? ''}
            onChange={(e) => onChange({ ...rules, other: e.target.value || undefined })}
            placeholder="自由記述"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </details>
    </div>
  )
}
