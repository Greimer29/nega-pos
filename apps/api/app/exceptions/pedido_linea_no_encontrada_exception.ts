import { Exception } from '@adonisjs/core/exceptions'

export default class PedidoLineaNoEncontradaException extends Exception {
  static status = 404
  static code = 'PEDIDO_LINEA_NO_ENCONTRADA'
  static message = 'Línea de pedido no encontrada'
}
