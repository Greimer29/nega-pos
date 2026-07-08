import env from '#start/env'
import mysql from 'mysql2/promise'

const DEV_DATABASE = 'nega_pos'
const DEFAULT_TEST_DATABASE = 'nega_pos_test'

/**
 * Refuses to run the suite against the local dev database.
 * Called after the app booted and env is loaded.
 */
export function assertTestDatabaseIsolated() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('assertTestDatabaseIsolated() must run with NODE_ENV=test')
  }

  const database = env.get('DB_DATABASE')

  if (database === DEV_DATABASE) {
    throw new Error(
      [
        'Refusing to run tests against the dev database "nega_pos".',
        'Tests must use "nega_pos_test" (see apps/api/.env.test and docs/LOCAL_DEV.md).',
      ].join(' ')
    )
  }

  if (database !== DEFAULT_TEST_DATABASE && !database.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against unexpected database "${database}". Use "${DEFAULT_TEST_DATABASE}".`
    )
  }
}

/**
 * Creates the test database if MySQL user lacks CREATE DATABASE privilege
 * (CI grants explicitly; local Docker user may need root or setup script).
 */
export async function ensureTestDatabaseExists() {
  const database = env.get('DB_DATABASE')

  const connection = await mysql.createConnection({
    host: env.get('DB_HOST'),
    port: env.get('DB_PORT'),
    user: env.get('DB_USER'),
    password: env.get('DB_PASSWORD') ?? '',
  })

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      [
        `Could not ensure test database "${database}" exists.`,
        'Run scripts/setup-mysql-local.sql or grant CREATE to the DB user.',
        message,
      ].join(' ')
    )
  } finally {
    await connection.end()
  }
}
