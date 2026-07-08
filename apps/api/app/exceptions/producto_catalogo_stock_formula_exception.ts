import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoCatalogoStockFormulaException extends Exception {
  static code = 'PRODUCTO_CON_FORMULA_SIN_STOCK_MANUAL'
  static message =
    'Los productos con fórmula no admiten stock manual: la existencia se calcula desde los materiales'
  static status = 409
}
