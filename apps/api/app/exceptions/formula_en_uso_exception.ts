import { Exception } from '@adonisjs/core/exceptions'

export default class FormulaEnUsoException extends Exception {
  static code = 'FORMULA_EN_USO'
  static message = 'No se puede eliminar: la fórmula está asignada a productos'
  static status = 409
}
