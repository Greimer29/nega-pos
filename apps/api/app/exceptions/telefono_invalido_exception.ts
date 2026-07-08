import { Exception } from '@adonisjs/core/exceptions'

export default class TelefonoInvalidoException extends Exception {
  static status = 422
  static code = 'TELEFONO_INVALIDO'
  static message = 'El teléfono no es válido. Usá formato internacional, ej. +584128332238'
}
