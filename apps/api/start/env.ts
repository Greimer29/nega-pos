import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),
  SESSION_MAX_AGE: Env.schema.string.optional(),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  /** Control-plane DB (companies, directory, platform admins). */
  DB_CENTRAL_DATABASE: Env.schema.string.optional(),
  /**
   * When true: login via central directory + per-company MySQL databases.
   * When false/absent: legacy single-DB mode (used by automated tests).
   */
  MULTI_TENANT_ENABLED: Env.schema.boolean.optional(),

  FRONTEND_URL: Env.schema.string({ format: 'url', tld: false }),
  DESKTOP_APP_ORIGIN: Env.schema.string.optional(),
  /** Origen Capacitor Android (típicamente https://localhost) */
  MOBILE_APP_ORIGIN: Env.schema.string.optional(),

  ADMIN_EMAIL: Env.schema.string({ format: 'email' }),
  ADMIN_PASSWORD: Env.schema.string(),
  ADMIN_NOMBRE: Env.schema.string(),

  PLATFORM_ADMIN_EMAIL: Env.schema.string.optional(),
  PLATFORM_ADMIN_PASSWORD: Env.schema.string.optional(),
  PLATFORM_ADMIN_NAME: Env.schema.string.optional(),

  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),

  DRIVE_DISK: Env.schema.string.optional(),
  STORAGE_LOCAL_PATH: Env.schema.string.optional(),

  /** App updates via GitHub Releases (desktop/mobile installers). */
  APP_UPDATES_ENABLED: Env.schema.boolean.optional(),
  APP_UPDATES_GITHUB_REPO: Env.schema.string.optional(),
  APP_UPDATES_GITHUB_TOKEN: Env.schema.string.optional(),
})
