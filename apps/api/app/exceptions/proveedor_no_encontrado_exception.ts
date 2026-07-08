import { Exception } from '@adonisjs/core/exceptions'

export default class SupplierNoEncontradoException extends Exception {
  static status = 404
  static code = 'PROVEEDOR_NO_ENCONTRADO'
  static message = 'Supplier no encontrado'
}
