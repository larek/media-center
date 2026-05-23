import Constants from 'expo-constants'
import { fetch as expoFetch } from 'expo/fetch'
import { createApiClient } from '@video-player/shared'

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://10.0.2.2:3001/api'

export const api = createApiClient({ baseUrl: apiUrl })

export async function streamBotChat({ messages, model, temperature, onDelta, onAction, onUsage, signal }) {
  const res = await expoFetch(`${apiUrl}/bot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, temperature }),
    signal,
  })

  if (!res.ok) {
    let errMsg = `botChat failed: ${res.status}`
    try {
      const data = await res.json()
      if (data?.error) errMsg = data.error
    } catch {}
    const err = new Error(errMsg)
    err.status = res.status
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let sep
      while ((sep = buf.indexOf('\n\n')) >= 0) {
        const event = buf.slice(0, sep)
        buf = buf.slice(sep + 2)
        if (!event.startsWith('data: ')) continue
        const data = event.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const obj = JSON.parse(data)
          if (obj?.action) {
            onAction?.(obj.action)
            continue
          }
          const delta = obj?.choices?.[0]?.delta?.content
          if (delta) onDelta?.(delta)
          if (obj?.usage) onUsage?.(obj.usage)
        } catch {}
      }
    }
  } finally {
    reader.releaseLock?.()
  }
}
