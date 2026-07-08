import { Exception } from '@adonisjs/core/exceptions'

export default class TelefonoDuplicadoException extends Exception {
  static code = 'TELEFONO_DUPLICADO'
  static message = 'Ya existe un customer con ese teléfono'

  constructor() {
    super(TelefonoDuplicadoException.message, {
      status: 422,
      code: TelefonoDuplicadoException.code,
    })
  }
}
