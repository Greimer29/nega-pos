import { Exception } from '@adonisjs/core/exceptions'

export default class PermisoDenegadoException extends Exception {
  static code = 'PERMISO_DENEGADO'
  static message = 'No tenés permiso para realizar esta acción'

  constructor(message?: string) {
    super(message ?? PermisoDenegadoException.message, {
      status: 403,
      code: PermisoDenegadoException.code,
    })
  }
}
