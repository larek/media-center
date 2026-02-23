export async function up(pool) {
  await pool.query(`
    CREATE TABLE tracks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
      s3_key VARCHAR(512) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX idx_tracks_artist_id ON tracks(artist_id)')
  await pool.query('CREATE INDEX idx_tracks_s3_key ON tracks(s3_key)')
}

export async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS tracks')
}
