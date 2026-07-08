import { Exception } from '@adonisjs/core/exceptions'

export default class FormulaNoEncontradaException extends Exception {
  static code = 'FORMULA_NO_ENCONTRADA'
  static message = 'Fórmula no encontrada'
  static status = 404
}
