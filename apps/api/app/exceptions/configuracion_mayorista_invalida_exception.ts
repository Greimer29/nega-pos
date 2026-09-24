import { Exception } from '@adonisjs/core/exceptions'

export default class ConfiguracionMayoristaInvalidaException extends Exception {
  static status = 422
  static code = 'CONFIGURACION_MAYORISTA_INVALIDA'
  static message = 'La configuración mayorista no es válida'
}
