# Media Center

Web audio player with S3 storage and real-time upload progress tracking.

## Features

- Upload audio files to S3-compatible storage
- Real-time upload progress (server + cloud stages via SSE)
- Audio streaming with seek support (Range requests)
- Track management (title, artist)
- Light/dark theme
- Drag & drop upload

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Express, Node.js
- **Storage:** S3-compatible (AWS, MinIO, etc.)
- **Database:** PostgreSQL

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env and configure
cp .env.example .env

# Start PostgreSQL
docker-compose up -d

# Run migrations
pnpm run migrate

# Start backend
pnpm run server

# Start frontend (separate terminal)
pnpm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | S3-compatible storage URL |
| `S3_ACCESS_KEY` | Access key |
| `S3_SECRET_KEY` | Secret key |
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | Region (default: `us-east-1`) |
| `PORT` | Server port (default: `3001`) |
| `POSTGRES_*` | PostgreSQL connection settings |

## License

MIT
