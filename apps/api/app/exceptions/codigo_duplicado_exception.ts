import { Exception } from '@adonisjs/core/exceptions'

export default class CodigoDuplicadoException extends Exception {
  static status = 422
  static code = 'CODIGO_DUPLICADO'
  static message = 'Ya existe un material o producto con ese código'
}
