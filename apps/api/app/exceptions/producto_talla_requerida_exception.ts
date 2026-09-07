import { Exception } from '@adonisjs/core/exceptions'

export default class ProductoTallaRequeridaException extends Exception {
  static status = 422
  static code = 'PRODUCTO_TALLA_REQUERIDA'
  static message = 'Este producto requiere elegir una talla.'
}
