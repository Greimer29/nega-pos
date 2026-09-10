import { Exception } from '@adonisjs/core/exceptions'

export default class ServicioCatalogoOperacionInvalidaException extends Exception {
  static status = 422
  static code = 'SERVICIO_CATALOGO_OPERACION_INVALIDA'
  static message = 'Esta operación no aplica a servicios del catálogo'
}
