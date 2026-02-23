import pool from '../db/index.js'

export async function getAllArtists() {
  const result = await pool.query('SELECT * FROM artists ORDER BY name')
  return result.rows
}

export async function getArtistById(id) {
  const result = await pool.query('SELECT * FROM artists WHERE id = $1', [id])
  return result.rows[0] || null
}

export async function getArtistByName(name) {
  const result = await pool.query('SELECT * FROM artists WHERE name = $1', [name])
  return result.rows[0] || null
}

export async function createArtist(name) {
  const result = await pool.query(
    'INSERT INTO artists (name) VALUES ($1) RETURNING *',
    [name]
  )
  return result.rows[0]
}

export async function findOrCreateArtist(name) {
  if (!name) return null
  const existing = await getArtistByName(name)
  if (existing) return existing
  return createArtist(name)
}

export async function updateArtist(id, name) {
  const result = await pool.query(
    'UPDATE artists SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  )
  return result.rows[0] || null
}

export async function deleteArtist(id) {
  const result = await pool.query('DELETE FROM artists WHERE id = $1 RETURNING *', [id])
  return result.rows[0] || null
}
