import { Exception } from '@adonisjs/core/exceptions'

export default class MaquinaNoEsCreditoException extends Exception {
  static status = 422
  static code = 'MAQUINA_NO_ES_CREDITO'
  static message = 'Solo se pueden abonar máquinas adquiridas a crédito'
}
