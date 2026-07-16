import type { Sale } from '@/features/ventas/types'
import type { PrintConfig, PrintDocumentKind } from '@/features/printing/types'
import { wrapTicketHtml } from '@/features/printing/templates/shared-css'
import {
  renderFormatBody,
  type RenderComandaOptions,
} from '@/features/printing/utils/format-template-engine'
import { resolveFormatForDocument } from '@/features/printing/utils/print-formats'

export type RenderedDocument = {
  kind: PrintDocumentKind
  title: string
  html: string
}

export type { RenderComandaOptions } from '@/features/printing/utils/format-template-engine'

export type PrintRenderConfig = Pick<PrintConfig, 'business' | 'formats' | 'documents' | 'ticket'>

export function renderSaleDocument(
  kind: PrintDocumentKind,
  sale: Sale,
  config: PrintRenderConfig,
  comandaOptions?: RenderComandaOptions
): RenderedDocument {
  const format = resolveFormatForDocument(
    config.formats,
    kind,
    config.documents[kind].formatId
  )
  const paperWidthMm = config.documents[kind].paperWidthMm || format.paperWidthMm
  const body = renderFormatBody(format, sale, config.business, config.ticket, comandaOptions)
  const titleByKind: Record<PrintDocumentKind, string> = {
    invoice: `Factura ${sale.code ?? sale.id}`,
    deliveryNote: `Nota de despacho ${sale.code ?? sale.id}`,
    comanda: `Comanda ${sale.code ?? sale.id}`,
  }

  return {
    kind,
    title: titleByKind[kind],
    html: wrapTicketHtml(body, paperWidthMm),
  }
}

export function renderTestDocument(
  kind: PrintDocumentKind,
  config: PrintRenderConfig,
  comandaOptions?: RenderComandaOptions
): RenderedDocument {
  return renderSaleDocument(kind, createSampleSale(), config, comandaOptions)
}

export function createSampleSale(): Sale {
  return {
    id: 1,
    code: '0000000001',
    customer_id: 1,
    guest_name: null,
    payment_method_code: 'cash_usd',
    payment_method: { code: 'cash_usd', name: 'Efectivo USD', currency_code: 'USD' },
    payment_type: 'CASH',
    billing_mode: 'FAST',
    order_status: 'DELIVERED',
    amount_paid_usd: '25.0000',
    balance_usd: '0.0000',
    credit_due_date: null,
    total_usd: '25.0000',
    total_bs: null,
    usd_rate: null,
    status: 'COMPLETED',
    sold_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    returned_at: null,
    customer: { id: 1, name: 'Cliente de ejemplo', type: 'CORPORATE', active: true, document: 'J-12345678-9' },
    sold_by: { id: 1, name: 'Vendedor Demo' },
    lines: [
      {
        id: 1,
        catalog_product_id: 1,
        material_id: null,
        description: 'Producto demo',
        quantity: '2',
        returned_quantity: '0',
        unit_price_usd: '10.0000',
        subtotal_usd: '20.0000',
        catalog_product: { id: 1, name: 'Camisa escolar', sale_unit: 'UND' },
      },
      {
        id: 2,
        catalog_product_id: 2,
        material_id: null,
        description: 'Producto demo 2',
        quantity: '1.5',
        returned_quantity: '0',
        unit_price_usd: '5.0000',
        subtotal_usd: '5.0000',
        catalog_product: { id: 2, name: 'Tela al corte', sale_unit: 'MTS' },
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
