import pool from '../db/index.js'

export async function getAllTracks() {
  const result = await pool.query(`
    SELECT t.*, a.name as artist, al.name as album, al.year as album_year
    FROM tracks t
    LEFT JOIN artists a ON t.artist_id = a.id
    LEFT JOIN albums al ON t.album_id = al.id
    ORDER BY t.created_at DESC
  `)
  return result.rows
}

export async function getTrackById(id) {
  const result = await pool.query(`
    SELECT t.*, a.name as artist, al.name as album, al.year as album_year
    FROM tracks t
    LEFT JOIN artists a ON t.artist_id = a.id
    LEFT JOIN albums al ON t.album_id = al.id
    WHERE t.id = $1
  `, [id])
  return result.rows[0] || null
}

export async function createTrack({ name, artist_id, s3_key }) {
  const result = await pool.query(
    'INSERT INTO tracks (name, artist_id, s3_key) VALUES ($1, $2, $3) RETURNING *',
    [name, artist_id || null, s3_key]
  )
  return result.rows[0]
}

export async function updateTrack(id, { name, artist_id }) {
  const fields = []
  const values = []
  let paramIndex = 1

  if (name !== undefined) {
    fields.push(`name = $${paramIndex++}`)
    values.push(name)
  }
  if (artist_id !== undefined) {
    fields.push(`artist_id = $${paramIndex++}`)
    values.push(artist_id)
  }

  if (fields.length === 0) return getTrackById(id)

  values.push(id)
  const result = await pool.query(
    `UPDATE tracks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function deleteTrack(id) {
  const result = await pool.query('DELETE FROM tracks WHERE id = $1 RETURNING *', [id])
  return result.rows[0] || null
}

export async function searchTracks(query, limit = 20) {
  const q = `%${query}%`
  const result = await pool.query(
    `SELECT t.id, t.name, t.s3_key,
            a.name AS artist, al.name AS album, al.year AS album_year
     FROM tracks t
     LEFT JOIN artists a ON t.artist_id = a.id
     LEFT JOIN albums al ON t.album_id = al.id
     WHERE t.name ILIKE $1 OR a.name ILIKE $1 OR al.name ILIKE $1
     ORDER BY
       CASE WHEN t.name ILIKE $1 THEN 0
            WHEN a.name ILIKE $1 THEN 1
            ELSE 2 END,
       t.created_at DESC
     LIMIT $2`,
    [q, Math.min(Math.max(limit, 1), 50)]
  )
  return result.rows
}

export async function getLibraryStats() {
  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tracks) AS tracks_count,
      (SELECT COUNT(*) FROM artists) AS artists_count
  `)
  const topArtists = await pool.query(`
    SELECT a.name, COUNT(t.id) AS tracks_count
    FROM artists a
    JOIN tracks t ON t.artist_id = a.id
    GROUP BY a.id, a.name
    ORDER BY tracks_count DESC
    LIMIT 10
  `)
  return {
    tracks_count: Number(totals.rows[0].tracks_count),
    artists_count: Number(totals.rows[0].artists_count),
    top_artists: topArtists.rows.map((r) => ({
      name: r.name,
      tracks_count: Number(r.tracks_count),
    })),
  }
}

export async function getTracksByIds(ids) {
  if (!ids?.length) return []
  const result = await pool.query(
    `SELECT t.id, t.name, t.s3_key,
            a.name AS artist, al.name AS album, al.year AS album_year
     FROM tracks t
     LEFT JOIN artists a ON t.artist_id = a.id
     LEFT JOIN albums al ON t.album_id = al.id
     WHERE t.id = ANY($1::int[])`,
    [ids]
  )
  const byId = new Map(result.rows.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}
