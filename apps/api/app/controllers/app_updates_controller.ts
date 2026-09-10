import AppUpdateService, { type AppUpdatePlatform } from '#services/app_update_service'
import type { HttpContext } from '@adonisjs/core/http'
import { Readable } from 'node:stream'

const PLATFORMS = new Set<AppUpdatePlatform>(['desktop', 'android'])

export default class AppUpdatesController {
  private service = new AppUpdateService()

  async latest({ request, serialize }: HttpContext) {
    const current = request.input('current') as string | undefined
    const data = await this.service.getLatest(current ?? null)

    return serialize(data)
  }

  async download({ params, response }: HttpContext) {
    const platform = String(params.platform ?? '').toLowerCase() as AppUpdatePlatform
    if (!PLATFORMS.has(platform)) {
      return response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plataforma inválida. Usá desktop o android.',
        },
      })
    }

    const file = await this.service.openDownloadStream(platform)
    response.header('Content-Type', file.contentType)
    response.header('Content-Disposition', `attachment; filename="${file.fileName}"`)
    if (file.contentLength && Number.isFinite(file.contentLength)) {
      response.header('Content-Length', String(file.contentLength))
    }
    response.header('Cache-Control', 'no-store')

    const nodeStream = Readable.fromWeb(file.body as import('node:stream/web').ReadableStream)
    return response.stream(nodeStream)
  }
}
