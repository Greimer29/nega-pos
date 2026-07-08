import { Exception } from '@adonisjs/core/exceptions'

export default class CategoriaDuplicadaException extends Exception {
  static status = 409
  static code = 'E_CATEGORIA_DUPLICADA'

  constructor() {
    super('Ya existe una categoría con ese nombre')
  }
}
