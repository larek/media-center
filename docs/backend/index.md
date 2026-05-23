# Backend

Express сервер с динамической системой роутинга, интеграцией S3 и PostgreSQL.

## Структура

```
server/
├── index.js              # Entry point, динамический загрузчик контроллеров
├── s3.js                 # S3 клиент и операции
├── uploadProgress.js     # EventEmitter для отслеживания прогресса загрузок
├── db/
│   ├── index.js          # PostgreSQL connection pool
│   ├── migrate.js        # Migration runner
│   └── migrations/
│       ├── 01_create_artists.js  # Таблица артистов
│       └── 02_create_tracks.js   # Таблица треков
├── repository/
│   ├── artists.js        # CRUD операции для artists
│   └── tracks.js         # CRUD + searchTracks / getLibraryStats / getTracksByIds (для Bot)
├── bot/                  # Не-роутный код Bot-фичи (LLM tools)
│   └── tools.js          # toolSchemas (для LLM) + toolImpls (JS-реализации)
└── controllers/
    ├── files/
    │   ├── list.js            # Список файлов в S3
    │   ├── upload.js          # Загрузка файла (UUID, checksum, сохранение в БД)
    │   ├── upload-progress.js # SSE эндпоинт для прогресса загрузки в S3
    │   ├── stream.js          # Стриминг с Range support
    │   ├── rename.js          # Переименование в S3 (устаревший)
    │   └── delete.js          # Удаление из S3 (устаревший)
    ├── tracks/
    │   ├── list.js       # Список треков из БД
    │   ├── create.js     # Создание трека
    │   ├── update.js     # Обновление трека (название, артист)
    │   └── delete.js     # Удаление трека (БД + S3)
    └── bot/
        └── chat.js       # POST /api/bot/chat — AiTunnel proxy + tool-loop, SSE-ответ
```

⚠️ **Утилитные модули, не являющиеся обработчиками роутов, должны лежать ВНЕ `controllers/`.** Динамический загрузчик регистрирует каждый `.js` файл в `controllers/<dir>/` как роут и требует `export default function(req, res)`. Поэтому tools для Bot живут в `server/bot/tools.js`, а не в `server/controllers/bot/tools.js` — иначе сервер падает на старте с `TypeError: argument handler must be a function`.

## Динамический роутинг

Сервер автоматически сканирует директорию `controllers/` и регистрирует роуты по паттерну:

```
/api/:controller/:action{/:key}
```

- `:controller` — имя директории в `controllers/`
- `:action` — имя файла (без `.js`)
- `:key` — опциональный параметр

### Добавление нового контроллера

1. Создать директорию: `server/controllers/users/`
2. Создать файл экшена: `server/controllers/users/profile.js`
3. Экспортировать функцию:

```javascript
export default async function (req, res) {
  res.json({ user: 'data' })
}
```

4. Роут автоматически доступен: `GET /api/users/profile`

## API Эндпоинты

### GET /api/files/list

Возвращает список всех файлов в bucket.

**Response:**
```json
[
  {
    "key": "track.mp3",
    "size": 5242880,
    "lastModified": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/files/upload

Загружает файл в S3 и создаёт запись в БД.

- Генерирует уникальное имя файла (UUID)
- Возвращает `uploadId` для отслеживания прогресса через SSE
- Загрузка в S3 происходит асинхронно после ответа
- Проверяет MD5 checksum после загрузки
- Сохраняет метаданные трека в базу данных

**Request:** `multipart/form-data` с полем `file`

**Response:**
```json
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /api/files/upload-progress/:uploadId

SSE эндпоинт для отслеживания прогресса загрузки в S3.

**Response:** Server-Sent Events stream

```
data: {"stage":"server","serverProgress":100,"s3Progress":0,"completed":false}

data: {"stage":"s3","serverProgress":100,"s3Progress":45,"completed":false}

data: {"stage":"s3","serverProgress":100,"s3Progress":100,"completed":true,"track":{...}}
```

**Поля события:**
| Поле | Тип | Описание |
|------|-----|----------|
| `stage` | `"server"` \| `"s3"` | Текущий этап загрузки |
| `serverProgress` | `number` | Прогресс загрузки на сервер (0-100) |
| `s3Progress` | `number` | Прогресс загрузки в S3 (0-100) |
| `completed` | `boolean` | Загрузка завершена |
| `error` | `string?` | Сообщение об ошибке |
| `track` | `object?` | Данные трека (при завершении) |

### GET /api/files/stream/:key

Стримит файл с поддержкой Range requests.

**Headers:**
- `Range: bytes=0-1000000` (опционально)

**Response:**
- `200 OK` — полный файл
- `206 Partial Content` — часть файла (при Range request)

**Response Headers:**
```
Content-Type: audio/mpeg
Content-Length: 1000001
Accept-Ranges: bytes
Content-Range: bytes 0-1000000/5242880
```

### PATCH /api/files/rename/:key

Переименовывает файл.

**Request:**
```json
{
  "newName": "new-track.mp3"
}
```

**Response:**
```json
{
  "success": true,
  "key": "new-track.mp3"
}
```

### DELETE /api/files/delete/:key

Удаляет файл.

**Response:**
```json
{
  "success": true
}
```

### GET /api/tracks/list

Возвращает список всех треков из базы данных.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Track Name",
    "artist": "Artist Name",
    "s3_key": "track.mp3",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/tracks/create

Создаёт новый трек в базе данных.

**Request:**
```json
{
  "name": "Track Name",
  "artist": "Artist Name",
  "s3_key": "track.mp3"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Track Name",
  "artist": "Artist Name",
  "s3_key": "track.mp3",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### PATCH /api/tracks/update/:id

Обновляет трек по ID. При указании артиста создаёт запись в таблице `artists` если её нет.

**Request:**
```json
{
  "name": "New Name",
  "artist": "New Artist"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "New Name",
  "artist_id": 1,
  "artist": "New Artist",
  "s3_key": "550e8400-e29b-41d4-a716-446655440000.mp3",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /api/tracks/delete/:id

Удаляет трек по ID из базы данных и файл из S3.

**Response:**
```json
{
  "success": true
}
```

### POST /api/bot/chat

AI-чат с function calling над библиотекой треков. Прокси к AiTunnel (OpenAI-совместимый API). Полное описание поведения, tool-loop и SSE-протокола — в [../bot.md](../bot.md).

**Request:**
```json
{
  "messages": [{ "role": "user", "content": "Включи Billie Jean" }],
  "model": "gpt-4o-mini",      // опционально, default — из AITUNNEL_MODEL
  "temperature": 0.7            // опционально
}
```

**Response:** Server-Sent Events stream (`text/event-stream`)

```
data: {"action":{"type":"play_tracks","tracks":[{"id":11,"name":"Algorithm","artist":"Muse","s3_key":"..."}]}}

data: {"choices":[{"delta":{"content":"Включаю Algorithm и Psycho от Muse."}}]}

data: [DONE]
```

Перед текстом могут прийти 0 или больше `action`-событий (если LLM вызвала `play_tracks`). Клиент диспетчит actions немедленно (запуск воспроизведения), затем рендерит текст.

**Лимиты:** до 50 сообщений в истории, до 8000 символов в одном сообщении, до 5 tool-rounds на запрос. Превышение → 400.

**Требует env:** `AITUNNEL_API_KEY` (без него — 503).

## База данных

### PostgreSQL

Проект использует PostgreSQL для хранения метаданных треков.

### Миграции

```bash
# Применить миграции
pnpm run migrate

# Откатить последнюю миграцию
pnpm run migrate:down
```

Миграции хранятся в `server/db/migrations/`. Каждый файл экспортирует функции `up()` и `down()`.

### Таблица artists

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Первичный ключ |
| name | VARCHAR(255) | Имя артиста |
| created_at | TIMESTAMP | Дата создания |

**Индексы:** `idx_artists_name` на поле `name`

### Таблица tracks

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Первичный ключ |
| name | VARCHAR(255) | Название трека |
| artist_id | INTEGER | FK на artists.id (ON DELETE SET NULL) |
| s3_key | VARCHAR(512) | UUID ключ файла в S3 |
| created_at | TIMESTAMP | Дата создания |

**Индексы:** `idx_tracks_artist_id`, `idx_tracks_s3_key`

### Repository

#### artists.js

| Функция | Описание |
|---------|----------|
| `getAllArtists()` | Получить всех артистов |
| `getArtistById(id)` | Получить артиста по ID |
| `getArtistByName(name)` | Получить артиста по имени |
| `createArtist(name)` | Создать артиста |
| `findOrCreateArtist(name)` | Найти или создать артиста |
| `updateArtist(id, name)` | Обновить артиста |
| `deleteArtist(id)` | Удалить артиста |

#### tracks.js

| Функция | Описание |
|---------|----------|
| `getAllTracks()` | Получить все треки (с JOIN на artists) |
| `getTrackById(id)` | Получить трек по ID |
| `getTracksByIds(ids)` | Получить треки по массиву ID (для Bot `play_tracks`) |
| `createTrack({ name, artist_id, s3_key })` | Создать трек |
| `updateTrack(id, { name, artist_id })` | Обновить трек |
| `deleteTrack(id)` | Удалить трек |
| `searchTracks(query, limit)` | ILIKE-поиск по name / artist / album с ранжированием (для Bot `search_tracks`) |
| `getLibraryStats()` | `{ tracks_count, artists_count, top_artists: [...] }` (для Bot `get_library_stats`) |

## S3 Клиент

Файл `s3.js` предоставляет функции для работы с S3:

| Функция | Описание |
|---------|----------|
| `listFiles()` | Список объектов в bucket |
| `uploadFile(key, body, contentType)` | Загрузка файла, возвращает `{ etag }` для проверки checksum |
| `uploadFileWithProgress(key, body, contentType, onProgress)` | Загрузка с callback прогресса (multipart upload) |
| `getFileStream(key, range)` | Получение стрима с поддержкой Range |
| `deleteFile(key)` | Удаление файла |
| `renameFile(oldKey, newKey)` | Переименование (copy + delete) |

### Upload Progress Store

Файл `uploadProgress.js` — EventEmitter для отслеживания прогресса загрузок:

| Метод | Описание |
|-------|----------|
| `create(uploadId, totalSize)` | Создать запись о загрузке |
| `updateServerProgress(uploadId, loaded, total)` | Обновить прогресс загрузки на сервер |
| `startS3Upload(uploadId)` | Переключить этап на S3 |
| `updateS3Progress(uploadId, loaded, total)` | Обновить прогресс загрузки в S3 |
| `complete(uploadId, track)` | Завершить загрузку |
| `setError(uploadId, error)` | Установить ошибку |
| `subscribe(uploadId, callback)` | Подписаться на обновления (возвращает unsubscribe) |

## Range Requests

Браузер автоматически отправляет Range requests при перемотке аудио. Сервер:

1. Парсит заголовок `Range: bytes=start-end`
2. Запрашивает диапазон из S3
3. Возвращает `206 Partial Content` с заголовками:
   - `Content-Range`
   - `Accept-Ranges`
   - `Content-Length`
