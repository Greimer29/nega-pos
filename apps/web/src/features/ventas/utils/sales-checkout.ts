import type { CreateSaleInput, ConfirmSaleInput, Sale } from '@/features/ventas/types'
import type { CartLine } from '@/features/ventas/utils/ventas-cart-lines'
import { cartLineUnitPrice } from '@/features/ventas/utils/ventas-cart-lines'
import { isValidEntityId } from '@/lib/route-id'

export type SaleCheckoutLine = CreateSaleInput['lines'][number] & {
  description?: string
}

type SaleClientPayload = Pick<CreateSaleInput, 'customer_id' | 'guest_name'>

export function buildSaleLines(cart: CartLine[]): SaleCheckoutLine[] {
  return cart.map((item) => {
    if (item.kind === 'material') {
      return {
        material_id: item.material.id,
        quantity: item.quantity,
        unit_price_usd: cartLineUnitPrice(item),
        ...(item.isWholesale ? { is_wholesale: true } : {}),
      }
    }

    return {
      catalog_product_id: item.product.id,
      quantity: item.quantity,
      unit_price_usd: cartLineUnitPrice(item),
      ...(item.isWholesale ? { is_wholesale: true } : {}),
      ...(item.detail?.trim() ? { description: item.detail.trim() } : {}),
      ...(item.catalogProductSizeId
        ? {
            catalog_product_size_id: item.catalogProductSizeId,
            size: item.size ?? undefined,
          }
        : {}),
      ...(item.kitchenNote?.trim() ? { kitchen_note: item.kitchenNote.trim() } : {}),
      ...(item.formulaMaterials && item.formulaMaterials.length > 0
        ? {
            formula_materials: item.formulaMaterials.map((material) => ({
              material_id: material.material_id,
              quantity_per_unit: material.quantity_per_unit,
            })),
          }
        : {}),
    }
  })
}

export function buildSaleDraftPayload(input: {
  cart: CartLine[]
  client: SaleClientPayload
  paymentType: CreateSaleInput['payment_type']
  billingMode: CreateSaleInput['billing_mode']
  discountUsd: number
}): CreateSaleInput {
  if (input.cart.length === 0) {
    throw new Error('Agregá al menos un producto al carrito.')
  }

  return {
    ...input.client,
    payment_type: input.paymentType,
    billing_mode: input.billingMode,
    discount_usd: input.discountUsd,
    lines: buildSaleLines(input.cart),
  }
}

export async function persistSaleDraft(input: {
  sourceSaleId: number | null
  payload: CreateSaleInput
  updateSale: (id: number, payload: CreateSaleInput) => Promise<unknown>
  createSale: (payload: CreateSaleInput) => Promise<Pick<Sale, 'id'>>
  onCreated: (saleId: number) => void
}): Promise<number> {
  if (input.sourceSaleId) {
    await input.updateSale(input.sourceSaleId, input.payload)
    return input.sourceSaleId
  }

  const sale = await input.createSale(input.payload)
  if (!isValidEntityId(sale.id)) {
    throw new Error('No se pudo guardar el borrador: la API no devolvió un ID válido.')
  }

  input.onCreated(sale.id)
  return sale.id
}

export async function finalizeSaleConfirmation<TPrintError>(input: {
  saleId: number
  paymentType: ConfirmSaleInput['payment_type']
  billingMode: ConfirmSaleInput['billing_mode']
  payload?: ConfirmSaleInput
  confirmSale: (id: number, payload: ConfirmSaleInput) => Promise<Pick<Sale, 'id'>>
  clearDraft: () => void
  getSale: (id: number) => Promise<Sale>
  printSale: (sale: Sale) => Promise<{ errors: TPrintError[] }>
  formatPrintErrors: (errors: TPrintError[]) => string
  getPrintErrorMessage: (error: unknown) => string
  onNavigate: (saleId: number, printNotice?: string) => void
}): Promise<void> {
  const sale = await input.confirmSale(input.saleId, {
    payment_type: input.paymentType,
    billing_mode: input.billingMode,
    ...input.payload,
  })

  input.clearDraft()

  try {
    const fullSale = await input.getSale(sale.id)
    const printResult = await input.printSale(fullSale)
    input.onNavigate(
      sale.id,
      printResult.errors.length > 0 ? input.formatPrintErrors(printResult.errors) : undefined
    )
  } catch (printError) {
    input.onNavigate(sale.id, input.getPrintErrorMessage(printError))
  }
}
