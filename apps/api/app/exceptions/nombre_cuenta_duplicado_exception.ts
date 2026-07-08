import { Exception } from '@adonisjs/core/exceptions'

export default class NombreCuentaDuplicadoException extends Exception {
  static code = 'NOMBRE_CUENTA_DUPLICADO'
  static message = 'Ya existe una cuenta con ese nombre'

  constructor() {
    super(NombreCuentaDuplicadoException.message, {
      status: 409,
      code: NombreCuentaDuplicadoException.code,
    })
  }
}
