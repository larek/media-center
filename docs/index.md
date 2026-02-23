# Audio Player

Веб-приложение для воспроизведения аудио файлов с хранением в S3-совместимом хранилище.

## Возможности

- Загрузка аудио файлов в S3 с проверкой checksum
- Воспроизведение с поддержкой перемотки (Range requests)
- Управление треками: название, артист
- Хранение метаданных в PostgreSQL
- Светлая и тёмная тема
- Drag & drop загрузка

## Структура проекта

```
video-player/
├── src/                  # Frontend (React)
├── server/               # Backend (Express)
├── docs/                 # Документация
│   ├── index.md          # Этот файл
│   ├── backend/          # Документация backend
│   └── frontend/         # Документация frontend
├── docker-compose.yml    # PostgreSQL контейнер
├── index.html            # HTML entry point
├── vite.config.js        # Конфигурация Vite
├── package.json          # Зависимости и скрипты
└── .env.example          # Пример переменных окружения
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
6. Запустить frontend: `pnpm run dev`

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
