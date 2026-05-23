# Деплой

Только backend деплоится на VPS. Frontend (web, mobile) собирается отдельно — web билд раздаётся как статика (ещё не настроено), mobile собирается через EAS и устанавливается на устройство.

## Прод-окружение

| Параметр | Значение |
|---|---|
| Хост | `212.8.226.206` |
| SSH | `ssh root@212.8.226.206` (ключ-доступ, без пароля) |
| Путь к коду | `/opt/media-player/` |
| Структура | только `server/` + `package.json` + `node_modules/` (без `apps/`, `packages/`) |
| Env-файл | `/opt/media-player/.env` (root-only, `chmod 600`) |
| Процесс | pm2 process `media-player`, script `server/index.js`, cwd `/opt/media-player`, user `root` |
| Порт | `3001`, наружу напрямую (без nginx-reverse-proxy) |
| Доступ клиента | мобилка/веб бьют на `http://212.8.226.206:3001/api/...` |

## Регулярный деплой

Из корня репозитория:

```bash
# 1. Сухой прогон — посмотреть, что улетит
rsync -avzn --delete --exclude='node_modules' --exclude='.env' --exclude='.env.*' \
  server/ root@212.8.226.206:/opt/media-player/server/

# 2. Реальный rsync
rsync -avz --delete --exclude='node_modules' --exclude='.env' --exclude='.env.*' \
  server/ root@212.8.226.206:/opt/media-player/server/

# 3. Рестарт процесса (контроллеры сканируются только при старте)
ssh root@212.8.226.206 'pm2 restart media-player'
```

⚠️ **`--delete` важен** — динамический загрузчик контроллеров регистрирует роуты по содержимому `controllers/`; если удалить файл локально, но забыть удалить на сервере — на проде роут продолжит работать со старым кодом.

⚠️ **`--exclude='.env*'` обязателен** — на сервере свой `.env` с прод-секретами (API-ключи, DB пароли), его перетирать нельзя.

## Добавление новых зависимостей

Если в `server/` появился `import` нового npm-пакета, нужно обновить и `package.json` на сервере:

```bash
# 1. Локально установить
cd server && npm install <pkg>

# 2. Залить package.json и package-lock.json на сервер
rsync -avz package.json package-lock.json root@212.8.226.206:/opt/media-player/

# 3. На сервере поставить зависимости и рестартануть
ssh root@212.8.226.206 'cd /opt/media-player && npm install --omit=dev && pm2 restart media-player'
```

Текущий `chat.js` использует только нативный `fetch` (Node 18+) — новых зависимостей не потребовалось.

## Изменение `.env` на сервере

Прод-`.env` редактируется руками (через `ssh` + `nano`/`vi`) — секреты в репо не коммитим. Чтобы добавить переменную без открытия редактора:

```bash
ssh root@212.8.226.206 'cat >> /opt/media-player/.env << EOF
NEW_VAR=value
EOF'
ssh root@212.8.226.206 'pm2 restart media-player --update-env'
```

Флаг `--update-env` заставляет pm2 перечитать `.env` при рестарте — без него процесс перезапустится со старым окружением.

Чтобы убедиться, что переменная подцепилась (не зная её значения):

```bash
ssh root@212.8.226.206 'grep -c "^MY_VAR" /opt/media-player/.env'  # должно вывести 1
```

## Проверка после деплоя

```bash
# Процесс жив
ssh root@212.8.226.206 'pm2 list'

# Свежие логи (errors + stdout)
ssh root@212.8.226.206 'pm2 logs media-player --lines 50 --nostream'

# Любой эндпоинт отвечает
curl -s http://212.8.226.206:3001/api/tracks/list | head

# Bot работает (если ключ настроен)
curl -s -X POST http://212.8.226.206:3001/api/bot/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"ping"}]}'
```

## Что НЕ деплоится автоматически

- **Миграции БД** (`server/db/migrations/*.js`) — после деплоя нужно вручную: `ssh root@212.8.226.206 'cd /opt/media-player && node server/db/migrate.js up'`. Это разовая операция, не часть обычного flow.
- **Frontend web** (`apps/web/dist`) — раздачи статики на VPS пока нет, web запускается локально (`pnpm dev`).
- **Mobile** — собирается через EAS, ставится на устройство отдельно (см. App Variants в `index.md`).

## База данных

PostgreSQL на сервере используется тот же, что в `docker-compose.yml`, но запущен не из репо — `pm2`-процесс читает `POSTGRES_*` из `/opt/media-player/.env`. SQL-бэкапы складываются в `~/app_<timestamp>.sql.gz` (cron — детали не известны, см. `crontab -e -u root` на сервере).

## История

- Раньше деплой делался ad-hoc (rsync вручную, mtime файлов на сервере от 23 февраля 2026).
- Скрипта/CI пока нет. Если деплой станет частым (>1 раза в неделю) — имеет смысл завернуть три rsync+restart команды в `scripts/deploy.sh`.
