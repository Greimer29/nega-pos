import { Exception } from '@adonisjs/core/exceptions'

export default class ClienteOInvitadoRequeridoException extends Exception {
  static status = 422
  static code = 'CLIENT_OR_GUEST_REQUIRED'
  static message = 'Indicá un cliente registrado o un nombre para facturar'
}
