import { Exception } from '@adonisjs/core/exceptions'

export default class EmailDuplicadoException extends Exception {
  static code = 'EMAIL_DUPLICADO'
  static message = 'Ya existe un customer con ese email'

  constructor() {
    super(EmailDuplicadoException.message, { status: 422, code: EmailDuplicadoException.code })
  }
}
