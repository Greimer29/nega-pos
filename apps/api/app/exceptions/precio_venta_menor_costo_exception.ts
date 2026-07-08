import { Exception } from '@adonisjs/core/exceptions'

export default class PrecioVentaMenorCostoException extends Exception {
  static status = 422
  static code = 'PRECIO_VENTA_MENOR_COSTO'
  static message = 'El precio de venta no puede ser menor al costo calculado'
}
