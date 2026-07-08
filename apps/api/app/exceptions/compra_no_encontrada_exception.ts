import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseNoEncontradaException extends Exception {
  static status = 404
  static code = 'COMPRA_NO_ENCONTRADA'
  static message = 'Purchase no encontrada'
}
