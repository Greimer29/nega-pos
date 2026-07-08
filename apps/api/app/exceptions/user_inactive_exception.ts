import { Exception } from '@adonisjs/core/exceptions'

export default class UserInactiveException extends Exception {
  static status = 403
  static code = 'USER_INACTIVE'
  static message = 'El usuario está inactive. Contactá al administrador.'
}
