import { Exception } from '@adonisjs/core/exceptions'

export default class CategoriaEnUsoException extends Exception {
  static status = 409
  static code = 'E_CATEGORIA_EN_USO'

  constructor(count: number) {
    super(`No se puede eliminar: ${count} producto(s) usan esta categoría`)
  }
}
