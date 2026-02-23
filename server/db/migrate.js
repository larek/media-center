import 'dotenv/config'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pool from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsPath = join(__dirname, 'migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT name FROM _migrations ORDER BY id')
  return result.rows.map(row => row.name)
}

async function runUp() {
  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  const files = await readdir(migrationsPath)
  const migrations = files.filter(f => f.endsWith('.js')).sort()

  for (const file of migrations) {
    if (applied.includes(file)) {
      console.log(`Skipping: ${file} (already applied)`)
      continue
    }

    console.log(`Applying: ${file}`)
    const migration = await import(join(migrationsPath, file))
    await migration.up(pool)
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`Applied: ${file}`)
  }

  console.log('Migrations complete')
}

async function runDown() {
  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  if (applied.length === 0) {
    console.log('No migrations to rollback')
    return
  }

  const lastMigration = applied[applied.length - 1]
  console.log(`Rolling back: ${lastMigration}`)

  const migration = await import(join(migrationsPath, lastMigration))
  await migration.down(pool)
  await pool.query('DELETE FROM _migrations WHERE name = $1', [lastMigration])
  console.log(`Rolled back: ${lastMigration}`)
}

const command = process.argv[2]

if (command === 'up') {
  runUp().then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
} else if (command === 'down') {
  runDown().then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
} else {
  console.log('Usage: node migrate.js [up|down]')
  process.exit(1)
}
