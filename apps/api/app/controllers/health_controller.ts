import { isAbsolute } from 'node:path'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { resolveStoragePath } from '#utils/storage_path'
import type { HttpContext } from '@adonisjs/core/http'

export default class HealthControleler {
  show(_ctx: HttpContext) {
    const storagePath = resolveStoragePath()
    const hasVolumeMount = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH)
    const persistent = app.inProduction ? isAbsolute(storagePath) || hasVolumeMount : true

    return {
      status: 'ok',
      timestamp: DateTime.utc().toISO(),
      storage: {
        path: storagePath,
        persistent,
      },
    }
  }
}
