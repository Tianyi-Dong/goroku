import { partOfSpeechOptions } from '../../config/partOfSpeech'
import { registerOptions } from '../../config/register'

interface VocabularyFieldsProps {
  reading: string
  partOfSpeech: string
  register: string[]
  onReadingChange: (v: string) => void
  onPartOfSpeechChange: (v: string) => void
  onRegisterChange: (v: string[]) => void
}

export default function VocabularyFields({
  reading,
  partOfSpeech,
  register,
  onReadingChange,
  onPartOfSpeechChange,
  onRegisterChange,
}: VocabularyFieldsProps) {
  return (
    <>
      <div>
        <label className="text-sm font-medium text-gray-700">読み方</label>
        <input
          type="text"
          value={reading}
          onChange={(e) => onReadingChange(e.target.value)}
          placeholder="ふりがな"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">品詞 *</label>
        <select
          value={partOfSpeech}
          onChange={(e) => onPartOfSpeechChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">選択してください</option>
          {partOfSpeechOptions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

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
