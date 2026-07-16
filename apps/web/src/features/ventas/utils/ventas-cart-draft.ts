import type { BillingMethod } from '@/features/ventas/constants'
import type { CatalogProduct } from '@/features/ventas/types'
import {
  createCartLineId,
  type SaleLineFormulaMaterial,
} from '@/features/ventas/utils/sale-line-formula'

const STORAGE_KEY = 'nega-pos:ventas-cart-draft'
const DRAFT_VERSION = 4

export type VentasCartDraftLine = {
  id: string
  product: CatalogProduct
  quantity: number
  formulaMaterials?: SaleLineFormulaMaterial[] | null
  unitPriceUsd?: number
  kitchenNote?: string | null
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

function normalizeFormulaMaterials(value: unknown): SaleLineFormulaMaterial[] | null | undefined {
  if (value === null) {
    return null
  }
  if (!Array.isArray(value)) {
    return undefined
  }

  const materials = value
    .filter(
      (item): item is SaleLineFormulaMaterial =>
        isRecord(item) &&
        typeof item.material_id === 'number' &&
        typeof item.quantity_per_unit === 'number'
    )
    .map((item) => ({
      material_id: item.material_id,
      quantity_per_unit: item.quantity_per_unit,
    }))

  return materials.length > 0 ? materials : null
}

function normalizeCartLine(line: unknown): VentasCartDraftLine | null {
  if (!isRecord(line) || !isRecord(line.product) || typeof line.product.id !== 'number') {
    return null
  }

  if (typeof line.quantity !== 'number' || line.quantity <= 0) {
    return null
  }

  return {
    id: typeof line.id === 'string' && line.id.trim() ? line.id : createCartLineId(),
    product: line.product as CatalogProduct,
    quantity: line.quantity,
    formulaMaterials: normalizeFormulaMaterials(line.formulaMaterials),
    unitPriceUsd:
      typeof line.unitPriceUsd === 'number' && Number.isFinite(line.unitPriceUsd)
        ? line.unitPriceUsd
        : undefined,
    kitchenNote:
      typeof line.kitchenNote === 'string' && line.kitchenNote.trim()
        ? line.kitchenNote.trim()
        : null,
  }
}

export function loadVentasCartDraft(): VentasCartDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return null
    }

    if (
      parsed.version !== DRAFT_VERSION &&
      parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3
    ) {
      return null
    }

    const cart = Array.isArray(parsed.cart) ? parsed.cart : []
    const normalizedCart = cart
      .map((line) => normalizeCartLine(line))
      .filter((line): line is VentasCartDraftLine => line !== null)

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
