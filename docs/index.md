# Audio Player

Веб-приложение для воспроизведения аудио файлов с хранением в S3-совместимом хранилище.

## Возможности

- Загрузка аудио файлов в S3 с проверкой checksum
- Воспроизведение с поддержкой перемотки (Range requests)
- Управление треками: название, артист
- Хранение метаданных в PostgreSQL
- Светлая и тёмная тема (web)
- Drag & drop загрузка (web)
- Фоновое воспроизведение и управление с локскрина / шторки уведомлений (mobile)

## Структура проекта

```
video-player/                # pnpm workspace
├── apps/
│   ├── web/                 # Frontend (React + Vite)
│   │   ├── src/
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   └── mobile/              # React Native (Expo SDK 54) — только воспроизведение
│       ├── src/
│       │   ├── api.js
│       │   ├── Player.js              # UI плеера на хуках RNTP, прижат к нижнему insets
│       │   ├── TrackList.js           # FlatList треков + кнопка download/прогресс/удалить
│       │   ├── Settings.js            # Apple-style settings modal (theme + scheme)
│       │   ├── theme.js               # ThemeProvider + 6 schemes × 2 modes (light/dark)
│       │   ├── downloads.js           # DownloadsProvider — createDownloadResumable + сканер локальной папки
│       │   ├── trackPlayer.js         # setupPlayerOnce + capabilities + url = local || stream
│       │   └── trackPlayerService.js  # remote-обработчики локскрина
│       ├── App.js                     # оркестрация + search input + safe-area insets + settings
│       ├── index.js                   # SafeAreaProvider + ThemeProvider + DownloadsProvider + registerRootComponent + registerPlaybackService
│       ├── app.json
│       ├── eas.json                   # профили development / preview / production
│       ├── .env                       # EXPO_PUBLIC_API_URL для dev-client
│       ├── metro.config.js
│       └── package.json
├── packages/
│   └── shared/              # API клиент и утилиты, общие для web и mobile
│       └── src/
├── patches/                 # pnpm patch для RNTP (фикс RN 0.81 Kotlin compat)
│   └── react-native-track-player@4.1.2.patch
├── server/                  # Backend (Express)
├── docs/                    # Документация
│   ├── index.md             # Этот файл
│   ├── backend/             # Документация backend
│   └── frontend/            # Документация frontend
├── docker-compose.yml       # PostgreSQL контейнер
├── pnpm-workspace.yaml      # Манифест воркспейса + patchedDependencies
├── package.json             # Серверные зависимости + orchestration скрипты
└── .env.example             # Пример переменных окружения
```

## Документация

| Раздел | Описание |
|--------|----------|
| [backend/](./backend/) | Архитектура сервера, API эндпоинты, работа с S3 |
| [frontend/](./frontend/) | React компоненты, хуки, стилизация |

## Быстрый старт

1. Скопировать `.env.example` в `.env` и настроить S3 credentials и PostgreSQL
2. Установить зависимости: `pnpm install`
3. Запустить PostgreSQL: `docker-compose up -d`
4. Применить миграции: `pnpm run migrate`
5. Запустить backend: `pnpm run server`
6. Запустить web: `pnpm run dev`
7. Mobile — собрать и поставить **dev-client** на телефон (см. ниже), затем `pnpm --filter @video-player/mobile exec expo start --dev-client`

## Mobile (Expo)

Приложение в `apps/mobile/` — React Native на Expo SDK 54 + `react-native-track-player` (RNTP) для фонового воспроизведения.

### Почему dev-client, а не Expo Go

RNTP содержит нативный код, которого нет в Expo Go, поэтому стандартное приложение Expo Go запускать **не будет** (ошибка «native module not found»). Используется **dev-client** — кастомная сборка приложения с зашитыми нативными зависимостями, в остальном работает как Expo Go (Metro, hot reload, QR-код).

### Архитектура аудио

- `src/trackPlayer.js` — `setupPlayerOnce()`: один раз поднимает плеер, настраивает capabilities (Play/Pause/Next/Previous/SeekTo/Stop) для уведомления и локскрина.
- `src/trackPlayerService.js` — playback-service, регистрируется в `index.js` через `TrackPlayer.registerPlaybackService`. Слушает remote-события (нажатия с локскрина / шторки / наушников) и проксирует их в TrackPlayer.
- `App.js` — собирает очередь треков из `/api/tracks/list`, при выборе трека делает `reset → add → skip(index) → play`. Подписан на `Event.PlaybackActiveTrackChanged` чтобы подсветка трека в списке синхронизировалась с кнопками next/prev на локскрине.
- `Player.js` — UI на хуках `useActiveTrack`, `usePlaybackState`, `useProgress`.

### UI и навигация

- Базовая стилистика — Spotify, но цвета берутся из активной палитры темы (см. ниже).
- Плеер прижат к нижней части экрана, список треков — над ним, ⚙ в правом верхнем углу открывает settings modal.
- Поиск: `TextInput` сверху списка, instant-фильтр по `name + artist` через `useMemo` (client-side, без бэкенд-запросов). При росте библиотеки до ~5k треков можно оставить как есть, дальше нужен серверный поиск с пагинацией.
- Приложение только воспроизводит треки — загрузка и удаление на бэкенд сделаны на web.

### Темизация

- `src/theme.js` — `ThemeProvider` (state: `mode` ∈ `light|dark`, `scheme` ∈ 6 вариантов) + `useTheme()` хук возвращает текущую `palette`.
- Schemes: `default` (Spotify), `gruvbox`, `oneDark`, `dracula` (light = Alucard), `tokyoNight`, `nord`. Каждая схема имеет полную палитру для обоих режимов (12 палитр).
- Каждая палитра содержит: `bg`, `bgElevated`, `bgInput`, `bgChip`, `border`, `text`, `textMuted`, `accent`, `accentText`, `playButton`, `playIcon`, `progressTrack`, `progressFill`, `artwork`, `artworkIcon`, `statusBarStyle`.
- Все компоненты (`App`, `TrackList`, `Player`, `Settings`) подтягивают цвета из `useTheme().palette` — переключение схемы/режима перекрашивает UI мгновенно.
- Хранение: in-memory React state (без AsyncStorage) — настройки сбрасываются на defaults при перезапуске приложения. Для persistence нужен `@react-native-async-storage/async-storage` (нативная либа → ребилд APK).

### Settings (Apple-style)

- `src/Settings.js` — `Modal` с `animationType="slide"`, открывается по тапу на ⚙.
- Nav-bar: `Done` слева (accent color), `Settings` по центру, разделитель `StyleSheet.hairlineWidth`.
- Группы: `borderRadius: 12`, `marginHorizontal: 16`, фон = `palette.bgElevated`, сепараторы между строк `marginLeft: 16` (классический iOS pattern).
- Section labels: uppercase, `letterSpacing: 0.5`, серый, отступ 32px слева.
- **THEME** блок: `Switch` "Dark mode" — `value={mode === 'dark'}`, `trackColor.true = accent`.
- **SCHEME** блок: 6 радио-строк с iOS-style preview-плиткой 36×36 (`borderRadius: 8`) — мини-мокап трек-роу (bg фон + accent точка + text/textMuted полоски). Активная строка отмечена чекмарком, нарисованным двумя `View`-полосками под углами 45°/-45° (геометрия выведена так, чтобы оба отрезка сходились ровно в точке (8, 17) в системе 24×24).
- **STORAGE** блок: `Downloaded` (count + размер, например `12 tracks · 87 MB`), `Device free` (`FileSystem.getFreeDiskStorageAsync` + `getTotalDiskCapacityAsync` → `X / Y GB`, перезапрос при открытии modal и при изменении `totalSize`), `Clear all downloads` (красная кнопка, `disabled` при пустоте, `Alert.alert` подтверждение перед удалением).

### Загрузка треков (offline-режим)

- `src/downloads.js` — `DownloadsProvider` + `useDownloads()` хук. Контекст экспортирует: `downloads`, `download`, `cancelDownload`, `deleteDownload`, `getLocalUri`, `clearAll`, `totalSize`, `downloadedCount`.
- Хранилище: `${FileSystem.documentDirectory}tracks/{trackId}.{ext}` (app-private storage, файлы не видны другим приложениям).
- При маунте провайдер сканит папку, на каждый файл зовёт `getInfoAsync` и сохраняет `{status: 'done', uri, size}` (источник истины — файловая система, не отдельный индекс).
- Скачивание: `expo-file-system/legacy` → `createDownloadResumable` с progress callback. Прогресс **throttled**: setState срабатывает не чаще раз в 120мс **и** только при изменении ≥1% (финальный 100% всегда проходит). Для корректного прогресса бэкенд должен отдавать `Content-Length` header.
- Состояния трека в UI (`TrackList`): `idle` → серая иконка ↓; `downloading` → процент accent-цветом + анимированная заливка всей строки слева направо (subtle accent с alpha `22`); `done` → круглая accent-кнопка с белым ↓ (тап = подтверждение удаления); `error` → красный `!` (тап = повтор).
- Анимация заливки: `Animated.Value` + комбинация `translateX` и `scaleX` (rotation pivot выведен математически вместо `transformOrigin`, который ломается на Android с native driver). Обе трансформации поддерживают `useNativeDriver: true` → 60fps на нативном потоке.
- При воспроизведении: `tracksToRntpQueue(tracks, streamUrl, getLocalUri)` подставляет локальный `file://` URI вместо стрима, если файл скачан.
- Сигнатура очереди в `App.js` включает `L|R` маркер для каждого трека — при изменении статуса скачивания очередь пересобирается на следующем `handleSelect`. Скачивание текущего играющего трека на лету источник не меняет (нужен ещё один select).
- Cancel: `resumable.pauseAsync()` + удаление частичного файла. Delete: `FileSystem.deleteAsync()`. ClearAll: останавливает все активные `resumable`'ы, удаляет всю папку `tracks/` и пересоздаёт её пустой.

### Safe area (Android edge-to-edge)

- `app.json` → `android.edgeToEdgeEnabled: true` — приложение рисуется под статус-баром и нав-баром.
- `react-native-safe-area-context` (~5.6.2) — `SafeAreaProvider` в `index.js` оборачивает `App`, в `App.js` через `useSafeAreaInsets()` берутся точные `insets.top` и `insets.bottom` (работает для жестового и 3-кнопочного навигаторов, складных, вырезов).
- `StatusBar` сделан прозрачным + `translucent`, верхний инсет залит цветом фона `#121212`, нижний инсет пробрасывается в `Player` как `paddingBottom`.

### Особенности конфигурации

- `app.json` → `newArchEnabled: false`. RNTP v4.1.2 имеет баг в bridgeless-режиме (#2593), native→JS события не доходят, и кнопки с локскрина не работают. Отключение New Arch — обязательное условие.
- `app.json` → `ios.infoPlist.UIBackgroundModes: ["audio"]` — без этого iOS убьёт звук при сворачивании.
- На Android `expo-build-properties` оставлен с `usesCleartextTraffic: true` (для http-стримов с локального backend), foreground service и медиа-разрешения подмерживаются из манифеста RNTP автоматически.
- `patches/react-native-track-player@4.1.2.patch` — фикс двух мест в `MusicModule.kt`, где `Arguments.fromBundle()` ломается из-за `Bundle?` nullability в RN 0.81. Подключён через `pnpm-workspace.yaml` → `patchedDependencies`, применяется автоматически при `pnpm install`. При апгрейде RNTP патч может перестать применяться — проверять.

### Подготовка окружения для Android

- JDK 17 (`brew install --cask temurin@17`)
- Android Studio + SDK Platform 34/35, Platform-Tools, один system image (Pixel API 34)
- В `~/.zshrc`:
  ```bash
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
  ```

### Сборка dev-client (один раз)

Локально на macOS (M-серия — быстрее облака):
```bash
cd apps/mobile
eas build --profile development -p android --local --output ./dev-client.apk
```
Через облако EAS (если локальное окружение не настроено):
```bash
eas build --profile development -p android
```

APK ставится на телефон один раз. После этого пересборка нужна **только** при изменении нативных зависимостей или `app.json` (плагины, разрешения, новые библиотеки).

### Запуск разработки

На Mac:
```bash
pnpm run server                                                    # backend
pnpm --filter @video-player/mobile exec expo start --dev-client    # Metro
```

На телефоне открыть установленный dev-client → сканировать QR-код. JS грузится с Mac, hot reload работает.

`apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.0.106:3001/api
```
IP должен указывать на машину с backend в той же WiFi. Перебить можно тем же env-варом на уровне профиля в `eas.json`.

Файрвол macOS должен пропускать `node` на 3001 (backend) и 8081 (Metro).

### Профили в eas.json

| Профиль | Что собирает | Когда нужен |
|---------|--------------|-------------|
| `development` | APK с dev-launcher, JS грузится с Metro | ежедневная разработка |
| `preview` | APK с зашитым JS-бандлом, debug signing | передать тестировщику, проверить «как у пользователя» |
| `production` | AAB с release signing | публикация в Google Play |

```bash
eas build --profile preview -p android --local --output ./release.apk   # релизный APK
eas build --profile production -p android                               # AAB для Play
eas submit -p android                                                    # отправить в Play
```

Перед публикацией — Google Play Console аккаунт ($25) и service account JSON для `eas submit`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `S3_ENDPOINT` | URL S3-совместимого хранилища |
| `S3_ACCESS_KEY` | Ключ доступа |
| `S3_SECRET_KEY` | Секретный ключ |
| `S3_BUCKET` | Имя bucket |
| `S3_REGION` | Регион (по умолчанию `us-east-1`) |
| `PORT` | Порт сервера (по умолчанию `3001`) |
| `POSTGRES_HOST` | Хост PostgreSQL (по умолчанию `localhost`) |
| `POSTGRES_PORT` | Порт PostgreSQL (по умолчанию `5432`) |
| `POSTGRES_DB` | Имя базы данных |
| `POSTGRES_USER` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
