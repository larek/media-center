export async function up(pool) {
  await pool.query(`
    ALTER TABLE tracks
    ADD COLUMN album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL
  `)
  await pool.query('CREATE INDEX idx_tracks_album_id ON tracks(album_id)')
}

export async function down(pool) {
  await pool.query('DROP INDEX IF EXISTS idx_tracks_album_id')
  await pool.query('ALTER TABLE tracks DROP COLUMN IF EXISTS album_id')
}
