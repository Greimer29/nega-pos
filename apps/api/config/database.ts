import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const sharedMysql = {
  host: env.get('DB_HOST'),
  port: env.get('DB_PORT'),
  user: env.get('DB_USER'),
  password: env.get('DB_PASSWORD'),
}

const centralDatabase = env.get('DB_CENTRAL_DATABASE') ?? env.get('DB_DATABASE')

const dbConfig = defineConfig({
  connection: 'mysql',
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        ...sharedMysql,
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
    },
    central: {
      client: 'mysql2',
      connection: {
        ...sharedMysql,
        database: centralDatabase,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations_central'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
