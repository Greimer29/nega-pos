import { Exception } from '@adonisjs/core/exceptions'

export default class AppUpdatesNoConfiguradoException extends Exception {
  static status = 503
  static code = 'APP_UPDATES_NO_CONFIGURADO'
  static message = 'Las actualizaciones de la app no están configuradas. Contactá al administrador.'

  constructor(message?: string) {
    super(message ?? AppUpdatesNoConfiguradoException.message, {
      status: AppUpdatesNoConfiguradoException.status,
      code: AppUpdatesNoConfiguradoException.code,
    })
  }
}
