import { Exception } from '@adonisjs/core/exceptions'

export default class UsuarioNoEncontradoException extends Exception {
  static code = 'USUARIO_NO_ENCONTRADO'
  static message = 'Usuario no encontrado'

  constructor() {
    super(UsuarioNoEncontradoException.message, {
      status: 404,
      code: UsuarioNoEncontradoException.code,
    })
  }
}
