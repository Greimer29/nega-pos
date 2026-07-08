import { isAbsolute } from 'node:path'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

/**
 * Resolves the local disk root for Adonis Drive.
 * - Relative paths (dev): under the app root, e.g. ./storage/uploads
 * - Absolute paths (Railway Volume): e.g. /data/uploads
 * - Fallback: RAILWAY_VOLUME_MOUNT_PATH when Railway attaches a volume
 */
export function resolveStoragePath(): string {
  const configured =
    env.get('STORAGE_LOCAL_PATH') ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? './storage/uploads'

  return isAbsolute(configured) ? configured : app.makePath(configured)
}
