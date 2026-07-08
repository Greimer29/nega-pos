import { Exception } from '@adonisjs/core/exceptions'

export default class CounterOrderExcedidoException extends Exception {
  static status = 422
  static code = 'CONTADOR_PEDIDO_EXCEDIDO'
  static message = 'Se alcanzó el límite de orders del mes (9999)'
}
