import type { BillingMethod } from '@/features/ventas/constants'
import type { CatalogProduct } from '@/features/ventas/types'

const STORAGE_KEY = 'nega-pos:ventas-cart-draft'
const DRAFT_VERSION = 1

export type VentasCartDraftLine = {
  product: CatalogProduct
  quantity: number
}

export type VentasCartDraft = {
  version: typeof DRAFT_VERSION
  cart: VentasCartDraftLine[]
  customerId: number | ''
  clientName: string
  customerCreditDays: number | null
  paymentType: 'CASH' | 'CREDIT'
  billingMethod: BillingMethod
  sourceSaleId: number | null
  sourceSaleLabel: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadVentasCartDraft(): VentasCartDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== DRAFT_VERSION) {
      return null
    }

    const cart = Array.isArray(parsed.cart) ? parsed.cart : []
    const normalizedCart = cart
      .filter(
        (line): line is VentasCartDraftLine =>
          isRecord(line) &&
          isRecord(line.product) &&
          typeof line.product.id === 'number' &&
          typeof line.quantity === 'number' &&
          line.quantity > 0
      )
      .map((line) => ({
        product: line.product as CatalogProduct,
        quantity: line.quantity,
      }))

    return {
      version: DRAFT_VERSION,
      cart: normalizedCart,
      customerId:
        typeof parsed.customerId === 'number' && parsed.customerId > 0 ? parsed.customerId : '',
      clientName: typeof parsed.clientName === 'string' ? parsed.clientName : '',
      customerCreditDays:
        typeof parsed.customerCreditDays === 'number' ? parsed.customerCreditDays : null,
      paymentType: parsed.paymentType === 'CREDIT' ? 'CREDIT' : 'CASH',
      billingMethod: parsed.billingMethod === 'ORDER' ? 'ORDER' : 'FAST',
      sourceSaleId: typeof parsed.sourceSaleId === 'number' ? parsed.sourceSaleId : null,
      sourceSaleLabel:
        typeof parsed.sourceSaleLabel === 'string' ? parsed.sourceSaleLabel : null,
    }
  } catch {
    return null
  }
}

export function saveVentasCartDraft(draft: Omit<VentasCartDraft, 'version'>): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        ...draft,
      } satisfies VentasCartDraft)
    )
  } catch {
    // sessionStorage lleno o no disponible — ignorar.
  }
}

export function clearVentasCartDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage no disponible — ignorar.
  }
}

export function isVentasCartDraftEmpty(draft: Omit<VentasCartDraft, 'version'>): boolean {
  return (
    draft.cart.length === 0 &&
    !draft.customerId &&
    !draft.clientName.trim() &&
    draft.sourceSaleId === null
  )
}
