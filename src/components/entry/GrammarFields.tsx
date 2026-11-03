import type { AttachmentRules } from '../../types/entry'
import { registerOptions } from '../../config/register'
import AttachmentRulesField from './AttachmentRulesField'

interface GrammarFieldsProps {
  attachmentRules: AttachmentRules
  register: string[]
  onAttachmentRulesChange: (rules: AttachmentRules) => void
  onRegisterChange: (v: string[]) => void
}

export default function GrammarFields({
  attachmentRules,
  register,
  onAttachmentRulesChange,
  onRegisterChange,
}: GrammarFieldsProps) {
  return (
    <>
      <AttachmentRulesField rules={attachmentRules} onChange={onAttachmentRulesChange} />

      <div>
        <label className="text-sm font-medium text-gray-700">使用域</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {registerOptions.map((reg) => (
            <label key={reg} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={register.includes(reg)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onRegisterChange([...register, reg])
                  } else {
                    onRegisterChange(register.filter((r) => r !== reg))
                  }
                }}
                className="rounded border-gray-300"
              />
              {reg}
            </label>
          ))}
        </div>
      </div>
    </>
  )
}
