import { Exception } from '@adonisjs/core/exceptions'

export default class MachineNoEncontradaException extends Exception {
  static code = 'MAQUINA_NO_ENCONTRADA'
  static message = 'Máquina no encontrada'

  constructor() {
    super(MachineNoEncontradaException.message, {
      status: 404,
      code: MachineNoEncontradaException.code,
    })
  }
}
