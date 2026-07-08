import { Exception } from '@adonisjs/core/exceptions'

export default class StockInsuficienteDevolucionException extends Exception {
  static code = 'INSUFFICIENT_STOCK_FOR_RETURN'
  static message = 'No hay stock suficiente para devolver esta compra'
  static status = 422

  constructor(
    public details: Array<{
      material_id: number
      material_name: string
      required: string
      available: string
    }>
  ) {
    super(StockInsuficienteDevolucionException.message)
  }
}
