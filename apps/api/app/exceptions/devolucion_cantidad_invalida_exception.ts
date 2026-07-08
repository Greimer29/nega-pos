import { Exception } from '@adonisjs/core/exceptions'

export default class DevolucionCantidadInvalidaException extends Exception {
  static status = 422
  static code = 'DEVOLUCION_CANTIDAD_INVALIDA'
  static message = 'La cantidad a devolver supera lo disponible en la línea'
}
