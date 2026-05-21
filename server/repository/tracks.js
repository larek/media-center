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
