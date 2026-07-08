import { Exception } from '@adonisjs/core/exceptions'

export default class OrderNoEncontradoException extends Exception {
  static code = 'PEDIDO_NO_ENCONTRADO'
  static message = 'Order no encontrado'

  constructor() {
    super(OrderNoEncontradoException.message, {
      status: 404,
      code: OrderNoEncontradoException.code,
    })
  }
}
