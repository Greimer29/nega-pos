import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseItemNoEncontradoException extends Exception {
  static status = 404
  static code = 'COMPRA_ITEM_NO_ENCONTRADO'
  static message = 'Ítem de purchase no encontrado'
}
