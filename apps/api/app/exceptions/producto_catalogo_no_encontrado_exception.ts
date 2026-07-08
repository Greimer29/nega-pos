import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoCatalogoNoEncontradoException extends Exception {
  static status = 404
  static code = 'PRODUCTO_CATALOGO_NO_ENCONTRADO'
  static message = 'Producto de catálogo no encontrado'
}
