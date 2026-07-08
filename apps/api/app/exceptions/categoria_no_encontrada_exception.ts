import { Exception } from '@adonisjs/core/exceptions'

export default class CategoriaNoEncontradaException extends Exception {
  static status = 404
  static code = 'E_CATEGORIA_NO_ENCONTRADA'

  constructor() {
    super('Categoría no encontrada')
  }
}
