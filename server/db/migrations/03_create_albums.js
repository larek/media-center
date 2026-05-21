export async function up(pool) {
  await pool.query(`
    CREATE TABLE albums (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
      cover_s3_key VARCHAR(512),
      year SMALLINT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX idx_albums_artist_id ON albums(artist_id)')
  await pool.query('CREATE INDEX idx_albums_name ON albums(name)')
}

export async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS albums')
}
