import { Exception } from '@adonisjs/core/exceptions'

export default class IncomeNoEncontradoException extends Exception {
  static code = 'INCOME_NOT_FOUND'
  static message = 'Ingreso no encontrado'
  static status = 404
}
