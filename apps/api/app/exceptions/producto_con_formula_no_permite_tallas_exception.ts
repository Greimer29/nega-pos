import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoConFormulaNoPermiteTallasException extends Exception {
  static status = 422
  static code = 'PRODUCTO_CON_FORMULA_NO_PERMITE_TALLAS'
  static message = 'Un producto con fórmula no puede tener tallas.'
}
