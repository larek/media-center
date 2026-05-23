import {
  searchTracks,
  getLibraryStats,
  getTracksByIds,
} from '../repository/tracks.js'

export const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'search_tracks',
      description:
        'Найти треки в библиотеке пользователя по имени, артисту или альбому. Возвращает массив объектов { id, name, artist, album }. Используй перед play_tracks, чтобы получить корректные id.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Текст для поиска. Может быть частью имени, артиста или альбома.',
          },
          limit: {
            type: 'integer',
            description: 'Максимум результатов (1–50). По умолчанию 20.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_library_stats',
      description:
        'Общая статистика библиотеки: количество треков, количество артистов, топ-10 артистов по числу треков. Используй для ответов типа "сколько у меня треков", "кто чаще всего".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_tracks',
      description:
        'Поставить указанные треки в очередь плеера и сразу запустить воспроизведение первого. Принимает массив id треков из библиотеки (получи их через search_tracks). После вызова пользователю откроется вкладка плеера.',
      parameters: {
        type: 'object',
        properties: {
          track_ids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Список id треков для воспроизведения в этом порядке.',
          },
        },
        required: ['track_ids'],
      },
    },
  },
]

export const toolImpls = {
  async search_tracks({ query, limit }) {
    if (typeof query !== 'string' || !query.trim()) {
      return { error: 'query must be a non-empty string' }
    }
    const rows = await searchTracks(query.trim(), limit ?? 20)
    return {
      results: rows.map((r) => ({
        id: r.id,
        name: r.name,
        artist: r.artist,
        album: r.album,
      })),
    }
  },

  async get_library_stats() {
    return await getLibraryStats()
  },

  async play_tracks({ track_ids }) {
    if (!Array.isArray(track_ids) || track_ids.length === 0) {
      return { error: 'track_ids must be a non-empty array of integers' }
    }
    const ids = track_ids.map(Number).filter(Number.isInteger)
    const tracks = await getTracksByIds(ids)
    if (tracks.length === 0) {
      return { error: 'no tracks found for given ids' }
    }
    return {
      played_count: tracks.length,
      titles: tracks.map((t) => `${t.artist ? `${t.artist} — ` : ''}${t.name}`),
      _action: {
        type: 'play_tracks',
        tracks: tracks.map((t) => ({
          id: t.id,
          name: t.name,
          artist: t.artist,
          album: t.album,
          s3_key: t.s3_key,
        })),
      },
    }
  },
}
