export async function up(pool) {
  await pool.query(`
    CREATE TABLE artists (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query('CREATE INDEX idx_artists_name ON artists(name)')
}

export async function down(pool) {
  await pool.query('DROP TABLE IF EXISTS artists')
}
