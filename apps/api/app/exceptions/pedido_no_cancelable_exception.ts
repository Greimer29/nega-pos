import { Exception } from '@adonisjs/core/exceptions'

export default class OrderNoCancelableException extends Exception {
  static status = 409
  static code = 'PEDIDO_NO_CANCELABLE'
  static message = 'No se puede cancelar un order entregado'
}
