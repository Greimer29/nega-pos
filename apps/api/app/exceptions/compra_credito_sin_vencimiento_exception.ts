import { Exception } from '@adonisjs/core/exceptions'

export default class CompraCreditoSinVencimientoException extends Exception {
  static status = 422
  static code = 'E_COMPRA_CREDITO_SIN_VENCIMIENTO'

  constructor() {
    super('La fecha de vencimiento es obligatoria para compras a crédito')
  }
}
