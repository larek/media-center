import { toolSchemas, toolImpls } from '../../bot/tools.js'

const MAX_MESSAGES = 50
const MAX_CONTENT_LEN = 8000
const MAX_TOOL_ROUNDS = 5
const DEFAULT_BASE_URL = 'https://api.aitunnel.ru/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'
const SYSTEM_PROMPT =
  'Ты помощник внутри музыкального приложения. Отвечай кратко: не более 3 предложений в обычном ответе. ' +
  'Если пользователь просит включить трек или найти что-то в его библиотеке — пользуйся инструментами search_tracks, get_library_stats, play_tracks. ' +
  'Перед play_tracks всегда сначала вызывай search_tracks, чтобы получить корректные id. ' +
  'Когда play_tracks отработал успешно, коротко подтверди по-русски (например: "Включаю Billie Jean").'

function callAiTunnel({ baseUrl, apiKey, body }) {
  return fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.AITUNNEL_API_KEY
  if (!apiKey) {
    return res
      .status(503)
      .json({ error: 'AITUNNEL_API_KEY is not configured on the server' })
  }

  const { messages, model, temperature } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }
  if (messages.length > MAX_MESSAGES) {
    return res
      .status(400)
      .json({ error: `messages exceeds limit of ${MAX_MESSAGES}` })
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return res.status(400).json({ error: 'each message must be an object' })
    }
    if (!['user', 'assistant', 'system'].includes(m.role)) {
      return res.status(400).json({ error: `invalid role: ${m.role}` })
    }
    if (typeof m.content !== 'string') {
      return res.status(400).json({ error: 'message content must be a string' })
    }
    if (m.content.length > MAX_CONTENT_LEN) {
      return res
        .status(400)
        .json({ error: `message content exceeds ${MAX_CONTENT_LEN} chars` })
    }
  }

  const baseUrl = process.env.AITUNNEL_BASE_URL || DEFAULT_BASE_URL
  const chosenModel = model || process.env.AITUNNEL_MODEL || DEFAULT_MODEL
  const convo = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  // ---- Tool rounds (non-streaming) ----
  const pendingActions = []
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let upstream
    try {
      upstream = await callAiTunnel({
        baseUrl,
        apiKey,
        body: {
          model: chosenModel,
          messages: convo,
          tools: toolSchemas,
          ...(typeof temperature === 'number' ? { temperature } : {}),
        },
      })
    } catch (err) {
      console.error('AiTunnel network error', err)
      return res.status(502).json({ error: 'Upstream request failed' })
    }

    if (!upstream.ok) {
      const text = await upstream.text()
      console.error('AiTunnel error', upstream.status, text.slice(0, 500))
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {}
      return res.status(upstream.status).json({
        error:
          parsed?.error?.message ||
          parsed?.message ||
          `AiTunnel request failed (${upstream.status})`,
      })
    }

    const data = await upstream.json()
    const msg = data?.choices?.[0]?.message
    if (!msg) {
      console.error('AiTunnel malformed response', JSON.stringify(data).slice(0, 500))
      return res.status(502).json({ error: 'Malformed upstream response' })
    }

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // Финальный ответ уже текстом. Стримим его как один чанк для совместимости с клиентом.
      streamFinalAnswer(res, msg.content || '', pendingActions, {
        model: data?.model || chosenModel,
        usage: data?.usage,
      })
      return
    }

    // Модель просит вызвать инструменты — сохраняем её ход и выполняем
    convo.push({
      role: 'assistant',
      content: msg.content ?? '',
      tool_calls: msg.tool_calls,
    })

    for (const tc of msg.tool_calls) {
      const fnName = tc?.function?.name
      const impl = toolImpls[fnName]
      let args = {}
      try {
        args = JSON.parse(tc?.function?.arguments ?? '{}')
      } catch (e) {
        console.warn('tool call args parse failed', fnName, e?.message)
      }
      let result
      if (!impl) {
        result = { error: `unknown tool: ${fnName}` }
      } else {
        try {
          result = await impl(args)
        } catch (e) {
          console.error('tool exec failed', fnName, e)
          result = { error: e?.message || 'tool execution failed' }
        }
      }
      // Side-channel actions (e.g. play_tracks) — выдернем перед отправкой LLM
      if (result && typeof result === 'object' && result._action) {
        pendingActions.push(result._action)
        const { _action, ...visible } = result
        result = visible
      }
      convo.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }
  }

  // Превысили лимит раундов — отдадим то, что есть
  streamFinalAnswer(
    res,
    'Не получилось выполнить запрос за разумное число шагов.',
    pendingActions,
    { model: chosenModel, usage: null }
  )
}

async function streamFinalAnswer(res, content, actions, meta) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  // Сначала экшены (чтобы клиент сразу мог начать воспроизведение)
  for (const a of actions) {
    res.write(`data: ${JSON.stringify({ action: a })}\n\n`)
  }

  // Затем текст финального ответа одним чанком в OpenAI-формате
  if (content) {
    res.write(
      `data: ${JSON.stringify({
        choices: [{ delta: { content } }],
      })}\n\n`
    )
  }

  res.write('data: [DONE]\n\n')
  res.end()

  if (meta?.usage) {
    const u = meta.usage
    console.log(
      `[bot] model=${meta.model} tokens=${u.total_tokens ?? '?'} ` +
        `cost=${u.cost_rub ?? '?'} RUB balance=${u.balance ?? '?'} RUB ` +
        `actions=${actions.length}`
    )
  } else if (actions.length) {
    console.log(`[bot] actions=${actions.length}`)
  }
}
