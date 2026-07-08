import { Exception } from '@adonisjs/core/exceptions'

export default class OrderNoDevolvableException extends Exception {
  static code = 'ORDER_NOT_RETURNABLE'
  static message = 'El pedido no puede devolverse en su estado actual'
  static status = 422
}
