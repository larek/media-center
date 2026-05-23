# Bot (AI чат с RAG над библиотекой)

Чат-помощник внутри мобильного приложения. Может отвечать на вопросы о текущей библиотеке треков и запускать воспроизведение прямо из диалога.

## Что умеет

- Отвечает на свободные вопросы (как обычный ChatGPT, через AiTunnel).
- Знает про библиотеку пользователя: статистика, поиск по треку/артисту/альбому.
- Запускает воспроизведение в плеере по запросу: «включи Billie Jean», «поставь что-нибудь от Muse». После команды автоматически переключает экран на Home.
- Стримит ответ по словам в стиле ChatGPT (SSE).
- Системный промпт ограничивает ответы 3 предложениями (опции — в `chat.js`).

## Стек

- **Провайдер LLM:** [AiTunnel](https://aitunnel.ru) — OpenAI-совместимый API без VPN, оплата в рублях. Модель по умолчанию `gpt-4o-mini`. Полная справка по поведению API — в [spotify-downloader-api.md](./spotify-downloader-api.md) аналогичный документ есть, но AiTunnel специфики мало: всё работает по OpenAI Chat Completions с дополнительными полями `usage.cost_rub` и `usage.balance`.
- **Function calling:** AiTunnel поддерживает OpenAI-формат `tools` + `tool_calls`. Используется как RAG-механизм — модель сама решает, когда полезть в БД и какие данные ей нужны.
- **Транспорт клиент↔сервер:** SSE (`text/event-stream`).
- **Стриминг на клиенте:** `expo/fetch` (стандартный RN `fetch` не отдаёт стрим).

## Архитектура

```
┌──────────────┐   POST /api/bot/chat        ┌─────────────────┐                ┌──────────┐
│  Mobile      │ ──────────────────────────► │  Express server │ ────tools──►   │ Postgres │
│  Bot.js      │                              │  bot/chat.js    │ ◄──results──   │ (tracks) │
│              │ ◄────── SSE stream ───────── │                 │                └──────────┘
│  api.js      │  text deltas + actions      │                 │ ──messages──►  ┌──────────┐
└──────────────┘                              └─────────────────┘  + tools      │ AiTunnel │
       │                                              ▲                          │ LLM API  │
       │  action: play_tracks                         │ ◄──tool_calls───────────│          │
       ▼                                              │ ◄──final text─────       │          │
┌──────────────┐                                      └──────────────────       └──────────┘
│ RNTP queue   │  ← Bot.js собирает очередь и
│ (Home.js)    │    navigate('Home')
└──────────────┘
```

### Tool-loop (на каждый запрос пользователя)

1. Сервер собирает `messages = [system_prompt, ...client_messages]` и шлёт в AiTunnel **с `tools: toolSchemas`**.
2. AiTunnel может ответить одним из двух:
   - **Финальный текст** — выводим его клиенту через SSE и закрываем поток.
   - **`tool_calls: [...]`** — модель просит выполнить инструмент.
3. Если пришли tool_calls:
   - Для каждого парсим `function.name` и `function.arguments`, дёргаем `toolImpls[name](args)`.
   - Результат заворачиваем в `{ role: 'tool', tool_call_id, content: JSON.stringify(result) }` и добавляем в `messages`.
   - Если инструмент вернул `_action` (например `play_tracks` → `{ type: 'play_tracks', tracks: [...] }`), он буферизуется отдельно — будет отправлен клиенту перед финальным текстом.
4. Повторяем с шага 1. Лимит — `MAX_TOOL_ROUNDS = 5`, чтобы модель не зациклилась.
5. Когда AiTunnel наконец отдал текст, сначала шлём клиенту накопленные actions (один SSE-event на каждый), затем текст одним чанком, затем `[DONE]`.

## SSE-протокол сервер→клиент

Расширенный OpenAI-формат — клиент парсит JSON каждого `data:`-события и смотрит на shape:

```
data: {"action":{"type":"play_tracks","tracks":[{"id":11,"name":"Algorithm",...}]}}\n\n
data: {"choices":[{"delta":{"content":"Включаю Algorithm и Psycho от Muse."}}]}\n\n
data: [DONE]\n\n
```

| Поле | Когда приходит | Что делать |
|---|---|---|
| `action` (объект) | До текста, если модель вызвала `play_tracks` | Выполнить действие сразу (диспетчить в плеер) |
| `choices[0].delta.content` | Финальный ответ | Аппендить к assistant-bubble |
| `usage` | В последнем чанке (опционально) | Логировать стоимость |
| `[DONE]` | Маркер конца | Закрыть reader |

В текущей реализации финальный текст приходит **одним чанком**, а не по токенам — потому что tool-loop в non-streaming режиме (читай ниже про trade-off). Плейсхолдер на клиенте (`думает…`/`ищет…`) сглаживает задержку.

## Карта файлов

| Файл | Назначение |
|---|---|
| `server/controllers/bot/chat.js` | Точка входа `POST /api/bot/chat`. Содержит `SYSTEM_PROMPT` (константа в начале файла), валидацию входа, tool-loop, формирование SSE-ответа. |
| `server/bot/tools.js` | `toolSchemas` — JSON-сигнатуры для LLM (description + parameters) и `toolImpls` — реальные JS-функции, дёргающие repository. **Лежит ВНЕ `controllers/`** (см. ниже). |
| `server/repository/tracks.js` | SQL-функции для tools: `searchTracks(query, limit)`, `getLibraryStats()`, `getTracksByIds(ids)`. |
| `apps/mobile/src/api.js` | `streamBotChat({ messages, onDelta, onAction, onUsage, signal })` — клиент стрима на `expo/fetch`, разбирает SSE и роутит события по callback-ам. |
| `apps/mobile/src/Bot.js` | UI чата. На `onDelta` — апдейтит последний assistant-bubble. На `onAction.type === 'play_tracks'` — собирает очередь через `tracksToRntpQueue`, дёргает `TrackPlayer.reset/add/play` и `navigation.navigate('Home')`. |

### ⚠️ Почему `tools.js` ВНЕ `controllers/`

Динамический загрузчик в `server/index.js` сканит **все** `.js` файлы в `controllers/<dir>/` и регистрирует их как роуты, ожидая в каждом `export default function(req, res)`. У `tools.js` дефолтного экспорта нет — если оставить его в `controllers/bot/`, сервер упадёт на старте с `TypeError: argument handler must be a function`. Поэтому модули, которые **не** являются обработчиками, должны жить в других директориях (`server/bot/`, `server/repository/`, `server/services/`).

## Текущие tools

Полные схемы — в `server/bot/tools.js`. Краткое описание:

| Tool | Аргументы | Что делает |
|---|---|---|
| `search_tracks` | `query: string`, `limit?: int (1–50)` | ILIKE-поиск по `tracks.name`, `artists.name`, `albums.name`. Ранжирование: совпадение по имени трека > по артисту > по альбому. Возвращает `{ results: [{id, name, artist, album}] }`. |
| `get_library_stats` | — | `{ tracks_count, artists_count, top_artists: [{name, tracks_count}] }`. Для запросов «сколько у меня треков», «топ артистов». |
| `play_tracks` | `track_ids: int[]` | Получает полные метаданные треков (включая `s3_key`), возвращает модели короткое подтверждение + side-channel `_action` с массивом треков. Сервер пушит action в SSE → клиент строит RNTP-очередь. |

## Добавление нового tool

Пример: «удали трек по запросу пользователя».

1. **Реализация в repository** (если нужна SQL — обычно уже есть, в нашем случае `deleteTrack(id)` есть).

2. **Сигнатура для LLM** — в `server/bot/tools.js` в `toolSchemas`:
```js
{
  type: 'function',
  function: {
    name: 'delete_track',
    description: 'Удалить трек из библиотеки. Используй только после подтверждения от пользователя.',
    parameters: {
      type: 'object',
      properties: { track_id: { type: 'integer' } },
      required: ['track_id'],
    },
  },
},
```

3. **Реализация в `toolImpls`:**
```js
async delete_track({ track_id }) {
  const removed = await deleteTrack(track_id)
  if (!removed) return { error: 'track not found' }
  return { deleted: { id: removed.id, name: removed.name } }
}
```

4. **Если tool инициирует UI-действие** (как `play_tracks`) — добавить в результат `_action: { type: '...', ... }`. Дописать обработку в `Bot.js → onAction`.

5. Перезапустить сервер (или задеплоить через `rsync + pm2 restart media-player`).

LLM сама подхватит новый tool из `toolSchemas` — описание `description` и параметры используется моделью для решения, когда его вызывать. **Текст `description` важен** — он буквально промпт, объясняющий назначение функции.

## Системный промпт

Хранится в `server/controllers/bot/chat.js` как константа `SYSTEM_PROMPT`. Текущий — задаёт три правила:
1. Ты помощник внутри музыкального приложения.
2. Отвечай кратко (≤3 предложений).
3. Для действий с библиотекой используй tools, перед play_tracks всегда search_tracks.

Можно сделать env-переменной (`AITUNNEL_SYSTEM_PROMPT`) — пока хардкод для простоты.

## Стоимость и логирование

После каждого финального ответа в pm2 логи пишется строка:
```
[bot] model=gpt-4o-mini tokens=145 cost=0.02 RUB balance=464.50 RUB actions=1
```

- `cost_rub` и `balance` приходят в `usage` от AiTunnel.
- Один запрос с одним tool-round ≈ удвоенная стоимость vs прямого ответа (две инференции). Запрос со сложным диалогом (поиск → play) может стоить 3 инференции (search → play → confirm).
- На `gpt-4o-mini` в среднем 0.01–0.05 ₽ на интеракцию.

Смотреть в реальном времени:
```bash
ssh root@212.8.226.206 'pm2 logs media-player --lines 50 --nostream' | grep '\[bot\]'
```

## Trade-off в текущей реализации

Tool-loop сейчас работает в **non-streaming** режиме — каждый раунд к LLM это полный `await response.json()`. Финальный текст шлётся клиенту одним чанком (а не по токенам как чистый стрим). Альтернатива — стримить каждый раунд и парсить tool_calls из накопления `delta.tool_calls[i].function.arguments` чанков — сильно сложнее код. Видимый эффект для пользователя: до начала текста есть задержка 1–4 секунды (1 round-trip к AiTunnel × N tool rounds). На клиенте это сглажено плейсхолдером (`думает…`/`ищет…`).

Если переход на полностью токен-по-токену стрим станет важен — переписать `chat.js` на парсинг стриминговых tool_calls.

## Известные ограничения

- **Авторизация отсутствует.** Любой, кто знает прод-URL, может бить в `/api/bot/chat` и расходовать AiTunnel баланс. Сейчас приложение однопользовательское — терпимо, но при первом признаке многопользовательности нужен device-id или API-key в заголовке.
- **Контекст диалога не персистится.** История живёт только в local state экрана Bot, при закрытии теряется. Для persistence — AsyncStorage или серверный thread storage.
- **`search_tracks` — только лексический ILIKE.** Семантические запросы вроде «что-то ритмичное похожее на Daft Punk» не сработают. Решается переходом на vector search через pgvector (Уровень 2 в плане архитектуры).
- **`play_tracks` не учитывает текущую очередь в Home.js.** Сейчас просто `reset + add + play` — если у пользователя играл альбом и он сказал боту «включи следующий», очередь полностью пересоберётся из одного нового трека. Логика «вставить в очередь» / «после текущего» не реализована.

## Переменные окружения

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `AITUNNEL_API_KEY` | Ключ из [aitunnel.ru/panel](https://aitunnel.ru/panel). Обязателен. | — |
| `AITUNNEL_MODEL` | ID модели (`gpt-4o-mini`, `deepseek-v3.2`, `gemini-2.5-flash` и т.д.) | `gpt-4o-mini` |
| `AITUNNEL_BASE_URL` | URL endpoint | `https://api.aitunnel.ru/v1` |

⚠️ Ключ только в `.env` сервера. Никогда не в `apps/mobile/.env` — `EXPO_PUBLIC_*` переменные зашиваются в JS-бандл и видны через декомпиляцию APK.
