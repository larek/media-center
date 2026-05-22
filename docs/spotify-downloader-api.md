# Spotify Downloader (RapidAPI) — интеграционный референс

Внешний сервис на RapidAPI: `spotify-downloader9.p.rapidapi.com`. Позволяет искать треки в каталоге Spotify и получать прямые ссылки на MP3-файлы.

Документ описывает поведение API на основе боевых проверок — официальная страница на RapidAPI про асинхронный режим скачивания (см. ниже) умалчивает, и без знания этой особенности кажется, что половина каталога недоступна.

## Назначение в проекте

Источник треков для пополнения библиотеки: пользователь ищет → получает MP3 → файл уходит в S3 через существующий пайплайн `controllers/files/upload.js`, метаданные — в таблицу `tracks`.

**Важно:** RapidAPI-ключ нельзя класть в клиент (web/mobile). Все запросы должны проксироваться через backend, ключ хранится только в `.env` сервера.

## Аутентификация

Все запросы требуют двух заголовков:

```
x-rapidapi-host: spotify-downloader9.p.rapidapi.com
x-rapidapi-key:  <ключ из .env, переменная SPOTIFY_DOWNLOADER_RAPIDAPI_KEY>
```

## Эндпоинты

### `GET /search` — поиск

| Параметр | Пример | Назначение |
|---|---|---|
| `q` | `michael jackson billie jean` | строка запроса (url-encoded) |
| `type` | `multi` / `tracks` / `albums` / `artists` / `playlists` | категория результатов; для нашей задачи — `tracks` |
| `limit` | `5..20` | сколько вернуть |
| `offset` | `0` | пагинация |
| `noOfTopResults` | `3` | сколько включить в секцию topResults |

Полный пример:

```bash
curl -s --get 'https://spotify-downloader9.p.rapidapi.com/search' \
  --data-urlencode 'q=michael jackson billie jean' \
  --data-urlencode 'type=tracks' \
  --data-urlencode 'limit=5' \
  --data-urlencode 'offset=0' \
  --data-urlencode 'noOfTopResults=3' \
  -H "x-rapidapi-host: spotify-downloader9.p.rapidapi.com" \
  -H "x-rapidapi-key: $SPOTIFY_DOWNLOADER_RAPIDAPI_KEY"
```

Структура ответа (только релевантные поля):

```json
{
  "success": true,
  "data": {
    "tracks": {
      "items": [
        {
          "data": {
            "id": "5ChkMS8OtdzJeqyybCc9R5",
            "uri": "spotify:track:5ChkMS8OtdzJeqyybCc9R5",
            "name": "Billie Jean",
            "artists": { "items": [ { "profile": { "name": "Michael Jackson" } } ] },
            "albumOfTrack": { "name": "Thriller 25 Super Deluxe Edition", "coverArt": {...} },
            "duration": { "totalMilliseconds": 293826 }
          }
        }
      ]
    },
    "albums":   { "items": [...] },
    "artists":  { "items": [...] },
    "playlists":{ "items": [...] }
  }
}
```

Из каждого айтема нужен **trackId** (`data.id` или последний сегмент `data.uri`) — он же является аргументом для `/downloadSong`. Имя/артист/обложку лучше брать из `/search`, так как `/downloadSong` отдаёт только базовую тройку (artist/title/album/cover).

### `GET /downloadSong` — получение ссылки на MP3

| Параметр | Формат |
|---|---|
| `songId` | **полный URL** трека на open.spotify.com, **url-encoded** |

Принимается именно URL, а не голый ID:

```
https%3A%2F%2Fopen.spotify.com%2Ftrack%2F<trackId>
```

Пример:

```bash
TRACK_ID=5ChkMS8OtdzJeqyybCc9R5
curl -s --get 'https://spotify-downloader9.p.rapidapi.com/downloadSong' \
  --data-urlencode "songId=https://open.spotify.com/track/$TRACK_ID" \
  -H "x-rapidapi-host: spotify-downloader9.p.rapidapi.com" \
  -H "x-rapidapi-key: $SPOTIFY_DOWNLOADER_RAPIDAPI_KEY"
```

Успешный ответ:

```json
{
  "success": true,
  "data": {
    "id": "5ChkMS8OtdzJeqyybCc9R5",
    "artist": "Michael Jackson",
    "title": "Billie Jean",
    "album": "Thriller 25 Super Deluxe Edition",
    "cover": "https://i.scdn.co/image/...",
    "downloadLink": "https://spotify-api.mybackend.in/download/.../...mp3?X-Amz-Algorithm=...&X-Amz-Expires=1800&X-Amz-Signature=..."
  },
  "generatedTimeStamp": 1779459906594
}
```

`downloadLink` — это presigned S3 URL с **временем жизни 30 минут** (`X-Amz-Expires=1800`). Перекачивать его в нашу инфраструктуру нужно сразу, не сохранять надолго.

Файлы — MP3, как правило 320 kbps, 44.1 или 48 kHz, с валидными ID3v2.3 тегами (название/артист/альбом/обложка уже зашиты).

## Асинхронное скачивание — ключевая особенность

HTTP-статус **всегда 200**. Реальный статус — в JSON-поле `success`. У `/downloadSong` есть три возможных исхода:

| `success` | `message` | Что значит | Что делать |
|---|---|---|---|
| `true` | — | трек в кэше провайдера, ссылка готова | использовать `data.downloadLink` |
| `false` | `"The song is being downloaded in the background. Please try again in 1-2 minutes."` | трека не было в кэше, этот запрос **поставил его в очередь** на стороне провайдера | подождать и повторить |
| `false` | `"Song failed to download"` | **не окончательный отказ**: тот же запрос на трек, которого ранее не существовало в системе. Фактически работает как первая постановка в очередь — следующий запрос обычно возвращает `"being downloaded in the background"` | подождать и повторить тот же запрос |

То есть `"Song failed to download"` — это **не ошибка**, а триггер. Без ретраев большая часть каталога будет казаться «недоступной»; с ретраями практически любой трек скачивается за 1–3 минуты.

**Рекомендуемая логика клиента:**

```
poll downloadSong(trackId):
  resp = GET /downloadSong?songId=…
  if resp.success: return resp.data.downloadLink
  if resp.message starts with "The song is being downloaded" OR
     resp.message == "Song failed to download":
       sleep 20s; повторить; до 12 попыток (≈4 минуты потолок)
  иначе: реальная ошибка — пробросить наверх
```

В нашем случае это удобно завернуть в SSE-эндпоинт по образцу `upload-progress.js`: клиент инициирует «добавить трек», сервер опрашивает `/downloadSong`, эмитит `queued` / `ready` / `failed`, на `ready` сам скачивает MP3 и кладёт в S3.

## Rate limits

Возвращаются в заголовках на каждый запрос:

| Заголовок | Значение на free-плане |
|---|---|
| `x-ratelimit-requests-limit` | **50** запросов в сутки (любые эндпоинты) |
| `x-ratelimit-download-song-limit` | **20** скачиваний в сутки |
| `x-ratelimit-download-playlist-and-album-limit` | **10** в сутки |
| `x-ratelimit-rapid-free-plans-hard-limit-limit` | **500000** (общий hard-cap RapidAPI) |
| `x-ratelimit-*-remaining` | сколько осталось |
| `x-ratelimit-*-reset` | секунды до сброса |

⚠️ Под лимит `download-song` попадают **все** обращения к `/downloadSong`, включая «холостые» опрашивающие запросы во время ожидания фоновой загрузки. Если делать ретраи каждые 5 секунд, 20 квот в сутки кончатся на 1–2 треках. Поэтому интервал опроса — **не чаще 20 секунд**, лучше 30.

Превышение `requests-limit` отдаст 429 — это уже HTTP-ошибка, а не `success:false`.

## Безопасность

- Ключ только на бекенде, в `.env`. Никогда не отдавать клиенту, даже временно для дебага.
- Presigned `downloadLink` — тоже не отдавать клиенту: он содержит подпись и позволяет скачать MP3 в обход нашего S3. Бекенд должен скачать файл, положить в наш бакет и отдать клиенту только итоговый track-id.
- При логировании запросов маскировать `x-rapidapi-key` и query-параметр `songId` (хоть он и публичный URL Spotify, но в логах виден частотный паттерн интересов пользователей).

## Известные ограничения

- Cover-art из `/downloadSong` — одна квадратная картинка, разрешение зависит от провайдера. Если нужна обложка в нескольких размерах, брать `coverArt.sources[]` из `/search` (там обычно три размера: 64/300/640).
- Метаданные ID3 в скачанном файле могут разойтись с тем, что вернул `/search` (например, альбом «Thriller 25 Super Deluxe Edition» вместо «Thriller»). Источником правды для нашей БД лучше делать `/search`, а не теги файла.
- Длительность трека в `/downloadSong` не возвращается — брать из `/search` (`data.duration.totalMilliseconds`).
- Сервис не отдаёт стабильный stream-URL, только разовые presigned ссылки на 30 минут. Прямой проксированный плеер без локальной копии в S3 на этом API не построить.

## Переменные окружения

| Переменная | Описание |
|---|---|
| `SPOTIFY_DOWNLOADER_RAPIDAPI_KEY` | Ключ из личного кабинета RapidAPI |
| `SPOTIFY_DOWNLOADER_RAPIDAPI_HOST` | `spotify-downloader9.p.rapidapi.com` (можно зашить константой) |
