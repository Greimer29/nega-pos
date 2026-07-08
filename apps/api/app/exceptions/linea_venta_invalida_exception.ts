import { Exception } from '@adonisjs/core/exceptions'

export default class LineaVentaInvalidaException extends Exception {
  static status = 422
  static code = 'LINEA_VENTA_INVALIDA'
  static message = 'Cada línea debe referenciar un producto de catálogo o un material, no ambos'
}
