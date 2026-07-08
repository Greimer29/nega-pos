import { Exception } from '@adonisjs/core/exceptions'

export type StockInsuficienteDetail = {
  material_id: number
  name: string
  stock_actual: number
  consumo_proyectado: number
  faltante: number
}

export default class StockInsuficienteException extends Exception {
  static status = 409
  static code = 'STOCK_INSUFICIENTE'

  readonly details: StockInsuficienteDetail[]

  constructor(details: StockInsuficienteDetail[]) {
    super('Stock insuficiente para uno o más materials de la receta', {
      status: StockInsuficienteException.status,
      code: StockInsuficienteException.code,
    })
    this.details = details
  }
}
