import { Exception } from '@adonisjs/core/exceptions'

export default class MachineExpenseNoEncontradoException extends Exception {
  static code = 'GASTO_MAQUINA_NO_ENCONTRADO'
  static message = 'Gasto de máquina no encontrado'

  constructor() {
    super(MachineExpenseNoEncontradoException.message, {
      status: 404,
      code: MachineExpenseNoEncontradoException.code,
    })
  }
}
