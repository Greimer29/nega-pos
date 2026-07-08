import { Exception } from '@adonisjs/core/exceptions'

export default class RutaIdInvalidoException extends Exception {
  static status = 422
  static code = 'INVALID_ID'
  static message = 'ID de recurso inválido'
}
