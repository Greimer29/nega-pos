import { Exception } from '@adonisjs/core/exceptions'

export default class BarcodeDuplicadoException extends Exception {
  static status = 422
  static code = 'BARCODE_DUPLICADO'
  static message = 'Ya existe un ítem con ese código de barras'

  constructor(message?: string) {
    super(message ?? BarcodeDuplicadoException.message, {
      status: BarcodeDuplicadoException.status,
      code: BarcodeDuplicadoException.code,
    })
  }
}
