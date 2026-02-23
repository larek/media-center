# Frontend

React приложение с Vite и Tailwind CSS.

## Структура

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Главный компонент
├── index.css             # Глобальные стили и CSS переменные
├── components/
│   ├── AudioPlayer.jsx   # Плеер с управлением воспроизведением
│   ├── UploadForm.jsx    # Форма загрузки файлов
│   └── ThemeToggle.jsx   # Переключатель темы
└── hooks/
    └── useAudio.js       # Хук управления аудио
```

## Компоненты

### App.jsx

Главный компонент приложения. Управляет:
- Списком файлов (fetch, отображение)
- Выбором трека
- Переименованием файлов (inline editing)
- Удалением файлов

**State:**
- `files` — список файлов из API
- `loading` — состояние загрузки
- `editingKey` — ключ редактируемого файла
- `editName` — новое имя файла

### AudioPlayer.jsx

Кастомный аудио плеер.

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `audioRef` | `RefObject` | Ref на `<audio>` элемент |
| `isPlaying` | `boolean` | Состояние воспроизведения |
| `duration` | `number` | Длительность трека (сек) |
| `currentTime` | `number` | Текущая позиция (сек) |
| `volume` | `number` | Громкость (0-1) |
| `currentTrack` | `object` | Текущий трек `{ key, size }` |
| `togglePlay` | `function` | Play/Pause |
| `seek` | `function` | Перемотка на позицию |
| `changeVolume` | `function` | Изменение громкости |

**Элементы управления:**
- Кнопка Play/Pause
- Progress bar с перемоткой по клику
- Отображение времени (текущее / общее)
- Слайдер громкости

### UploadForm.jsx

Компонент загрузки файлов.

**Возможности:**
- Drag & drop
- Выбор файла через клик
- Progress bar загрузки
- Валидация типа файла (только `audio/*`)

**Props:**
| Prop | Тип | Описание |
|------|-----|----------|
| `onUploadComplete` | `function` | Callback после успешной загрузки |

### ThemeToggle.jsx

Переключатель светлой/тёмной темы.

**Поведение:**
- Сохраняет выбор в `localStorage`
- При первом запуске использует системные настройки
- Добавляет/убирает класс `dark` на `<html>`

## Хуки

### useAudio

Хук для управления HTML5 Audio API.

**Возвращает:**
```javascript
{
  audioRef,      // Ref для <audio> элемента
  isPlaying,     // boolean
  duration,      // number (секунды)
  currentTime,   // number (секунды)
  volume,        // number (0-1)
  currentTrack,  // { key, size } | null
  play,          // () => void
  pause,         // () => void
  togglePlay,    // () => void
  seek,          // (time: number) => void
  changeVolume,  // (volume: number) => void
  loadTrack,     // (track: object) => void
}
```

**События аудио:**
- `timeupdate` — обновление `currentTime`
- `loadedmetadata` — получение `duration`
- `ended` — окончание трека

## Стилизация

### CSS Переменные

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
}

.dark {
  --bg-primary: #17212b;
  --bg-secondary: #0e1621;
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --accent: #60a5fa;
  --accent-hover: #3b82f6;
}
```

### Tailwind

Используется Tailwind CSS v4 с плагином `@tailwindcss/vite`.

**Dark mode:**
```css
@custom-variant dark (&:where(.dark, .dark *));
```

**Использование:**
```jsx
<div className="bg-[var(--bg-primary)] dark:bg-[var(--bg-secondary)]">
```

## API Взаимодействие

| Действие | Endpoint |
|----------|----------|
| Список файлов | `GET /api/files/list` |
| Загрузка | `POST /api/files/upload` |
| Стриминг | `GET /api/files/stream/:key` |
| Переименование | `PATCH /api/files/rename/:key` |
| Удаление | `DELETE /api/files/delete/:key` |

## Vite Config

```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

Все запросы к `/api/*` проксируются на backend сервер.
