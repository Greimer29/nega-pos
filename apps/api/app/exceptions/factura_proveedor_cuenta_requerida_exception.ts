import { Exception } from '@adonisjs/core/exceptions'

export default class FacturaProveedorCuentaRequeridaException extends Exception {
  static status = 422
  static code = 'FACTURA_PROVEEDOR_CUENTA_REQUERIDA'
  static message = 'La cuenta es obligatoria para registrar una factura de contado.'
}
