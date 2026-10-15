import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseItemReferenciaInvalidaException extends Exception {
  static status = 422
  static code = 'COMPRA_ITEM_REFERENCIA_INVALIDA'
  static message =
    'Cada ítem debe referenciar exactamente un material, un producto de catálogo o una máquina'
}
