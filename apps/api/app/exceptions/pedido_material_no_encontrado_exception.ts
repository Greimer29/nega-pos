import { Exception } from '@adonisjs/core/exceptions'

export default class OrderMaterialNoEncontradoException extends Exception {
  static status = 404
  static code = 'PEDIDO_MATERIAL_NO_ENCONTRADO'
  static message = 'Material de receta no encontrado en el order'
}
