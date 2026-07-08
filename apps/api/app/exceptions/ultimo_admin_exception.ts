import { Exception } from '@adonisjs/core/exceptions'

export default class UltimoAdminException extends Exception {
  static code = 'ULTIMO_ADMIN'
  static message = 'Debe quedar al menos un administrador activo'

  constructor(message?: string) {
    super(message ?? UltimoAdminException.message, {
      status: 422,
      code: UltimoAdminException.code,
    })
  }
}
