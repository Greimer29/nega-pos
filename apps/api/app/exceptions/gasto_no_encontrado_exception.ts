import { Exception } from '@adonisjs/core/exceptions'

export default class ExpenseNoEncontradoException extends Exception {
  static code = 'EXPENSE_NOT_FOUND'
  static message = 'Gasto no encontrado'
  static status = 404
}
