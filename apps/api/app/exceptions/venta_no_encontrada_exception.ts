import { Exception } from '@adonisjs/core/exceptions'

export default class VentaNoEncontradaException extends Exception {
  static status = 404
  static code = 'VENTA_NO_ENCONTRADA'
  static message = 'Venta no encontrada'
}
