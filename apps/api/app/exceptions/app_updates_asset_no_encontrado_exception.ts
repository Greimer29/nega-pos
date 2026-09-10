import { Exception } from '@adonisjs/core/exceptions'

export default class AppUpdatesAssetNoEncontradoException extends Exception {
  static status = 404
  static code = 'APP_UPDATES_ASSET_NO_ENCONTRADO'
  static message = 'No hay un instalador disponible para esta plataforma en la última release.'

  constructor(message?: string) {
    super(message ?? AppUpdatesAssetNoEncontradoException.message, {
      status: AppUpdatesAssetNoEncontradoException.status,
      code: AppUpdatesAssetNoEncontradoException.code,
    })
  }
}
