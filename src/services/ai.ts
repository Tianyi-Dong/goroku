interface AIConfig {
  endpoint: string
  model: string
  apiKey: string
}

export function getAIConfig(): AIConfig | null {
  const endpoint = localStorage.getItem('ai_endpoint')
  const model = localStorage.getItem('ai_model')
  const apiKey = localStorage.getItem('ai_api_key')
  if (!endpoint || !model || !apiKey) return null
  return { endpoint, model, apiKey }
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem('ai_endpoint', config.endpoint)
  localStorage.setItem('ai_model', config.model)
  localStorage.setItem('ai_api_key', config.apiKey)
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const REQUEST_TIMEOUT_MS = 30_000
const ERROR_TEXT_MAX_LENGTH = 500

export async function chatCompletion(
  messages: ChatMessage[],
  config?: AIConfig | null,
  options?: { timeoutMs?: number },
): Promise<string> {
  const cfg = config ?? getAIConfig()
  if (!cfg) throw new Error('AI設定が未構成です。設定ページでAPIキーを入力してください。')

  const url = cfg.endpoint.replace(/\/+$/, '') + '/chat/completions'

  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.3,
      }),
      signal: controller.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error(`AIサーバーからの応答がありません（${timeoutMs / 1000}秒でタイムアウト）`)
    }
    throw new Error(`AIサーバーに接続できませんでした: ${(e as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const text = (await response.text()).slice(0, ERROR_TEXT_MAX_LENGTH)
    throw new Error(`AI API error (${response.status}): ${text}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('AI APIの応答形式が正しくありません')
  }
  return content
}
