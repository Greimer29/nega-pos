import type Sale from '#models/sale'
import type SaleLine from '#models/sale_line'
import { serializeCustomerResumen } from '#transformers/customer_transformer'
import { serializeFormulaDetail } from '#transformers/formula_transformer'
import { serializeSaleLineFormulaFields } from '#transformers/sale_line_formula_transformer'

function serializePaymentMethodSummary(sale: Sale) {
  const method = sale.paymentMethod
  if (!method || !sale.paymentMethodCode) {
    return null
  }

  return {
    code: method.code,
    name: method.name,
    currency_code: method.currencyCode,
  }
}

function serializeSoldBySummary(sale: Sale) {
  const seller = sale.soldBy
  if (!seller || !sale.soldByUserId) {
    return null
  }

  return {
    id: Number(seller.id),
    name: seller.name,
  }
}

export function serializeSale(sale: Sale) {
  return {
    id: Number(sale.id),
    code: sale.code,
    customer_id: sale.customerId ? Number(sale.customerId) : null,
    guest_name: sale.guestName,
    payment_method_code: sale.paymentMethodCode,
    payment_method: serializePaymentMethodSummary(sale),
    payment_type: sale.paymentType,
    billing_mode: sale.billingMode,
    order_status: sale.orderStatus,
    amount_paid_usd: sale.amountPaidUsd,
    balance_usd: sale.balanceUsd,
    credit_due_date: sale.creditDueDate?.toISODate() ?? null,
    discount_usd: sale.discountUsd ?? '0.0000',
    total_usd: sale.totalUsd,
    total_bs: sale.totalBs,
    usd_rate: sale.usdRate,
    status: sale.status,
    sold_at: sale.soldAt?.toISO() ?? null,
    confirmed_at: sale.confirmedAt?.toISO() ?? null,
    returned_at: sale.returnedAt?.toISO() ?? null,
    customer: sale.customer ? serializeCustomerResumen(sale.customer) : null,
    sold_by: serializeSoldBySummary(sale),
    lines: sale.saleLines?.map(serializeSaleLine),
    created_at: sale.createdAt.toISO(),
    updated_at: sale.updatedAt.toISO(),
  }
}

export function serializeSaleListItem(sale: Sale) {
  return {
    id: Number(sale.id),
    code: sale.code,
    customer_id: sale.customerId ? Number(sale.customerId) : null,
    guest_name: sale.guestName,
    payment_method_code: sale.paymentMethodCode,
    payment_method: serializePaymentMethodSummary(sale),
    payment_type: sale.paymentType,
    billing_mode: sale.billingMode,
    order_status: sale.orderStatus,
    amount_paid_usd: sale.amountPaidUsd,
    balance_usd: sale.balanceUsd,
    discount_usd: sale.discountUsd ?? '0.0000',
    total_usd: sale.totalUsd,
    total_bs: sale.totalBs,
    status: sale.status,
    sold_at: sale.soldAt?.toISO() ?? null,
    customer: sale.customer ? serializeCustomerResumen(sale.customer) : null,
  }
}

export function serializeSaleLine(line: SaleLine) {
  return {
    id: Number(line.id),
    catalog_product_id: line.catalogProductId ? Number(line.catalogProductId) : null,
    catalog_product_size_id: line.catalogProductSizeId ? Number(line.catalogProductSizeId) : null,
    size: line.size ?? null,
    material_id: line.materialId ? Number(line.materialId) : null,
    description: line.description,
    kitchen_note: line.kitchenNote ?? null,
    quantity: line.quantity,
    returned_quantity: line.returnedQuantity ?? '0.000',
    unit_price_usd: line.unitPriceUsd,
    subtotal_usd: line.subtotalUsd,
    cost_usd: line.costUsd,
    ...serializeSaleLineFormulaFields(line),
    catalog_product: line.catalogProduct
      ? {
          id: Number(line.catalogProduct.id),
          name: line.catalogProduct.name,
          category: line.catalogProduct.category,
          sale_unit: line.catalogProduct.saleUnit,
          formula: line.catalogProduct.formula
            ? serializeFormulaDetail(line.catalogProduct.formula)
            : null,
        }
      : null,
    material: line.material
      ? {
          id: Number(line.material.id),
          name: line.material.name,
          code: line.material.code,
          unit: line.material.unit,
        }
      : null,
  }
}
