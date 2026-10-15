import { Exception } from '@adonisjs/core/exceptions'

export default class MaquinaCreditoCostoRequeridoException extends Exception {
  static status = 422
  static code = 'MAQUINA_CREDITO_COSTO_REQUERIDO'
  static message = 'Una máquina a crédito requiere un costo de adquisición mayor a cero'
}
