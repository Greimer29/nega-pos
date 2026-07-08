import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoCatalogoEnPedidosActivosException extends Exception {
  static status = 409
  static code = 'PRODUCTO_CATALOGO_EN_PEDIDOS_ACTIVOS'
  static message = 'No se puede eliminar: el producto está en pedidos activos'
}
