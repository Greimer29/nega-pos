import { Exception } from '@adonisjs/core/exceptions'

export default class RifDuplicadoException extends Exception {
  static status = 422
  static code = 'RIF_DUPLICADO'
  static message = 'Ya existe un supplier con ese RIF'
}
