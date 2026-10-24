import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import VentaNoEditableException from '#exceptions/venta_no_editable_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import Sale from '#models/sale'
import BusinessProfileService from '#services/business_profile_service'
import CurrencyService from '#services/currency_service'
import { nowInAppZone } from '#utils/app_timezone'
import { buildSaleQuoteDocument } from '#utils/sale_quote_document'
import { renderSaleQuotePdf } from '#utils/sale_quote_pdf'

export type SaleQuotePdf = {
  filename: string
  bytes: Buffer
}

export default class SaleQuoteService {
  private businessProfileService = new BusinessProfileService()
  private currencyService = new CurrencyService()

  /** PDF quote of a draft sale with amounts in `currencyCode` (base currency when omitted). */
  async generarPdf(saleId: number, currencyCode?: string | null): Promise<SaleQuotePdf> {
    const sale = await Sale.query()
      .where('id', saleId)
      .preload('customer')
      .preload('saleLines', (query) => {
        query.preload('catalogProduct').preload('material').orderBy('id', 'asc')
      })
      .first()

    if (!sale) {
      throw new VentaNoEncontradaException()
    }
    if (sale.status !== 'DRAFT') {
      throw new VentaNoEditableException(
        'Solo se puede generar el presupuesto de facturas en borrador.'
      )
    }

    const [profile, rates, baseCode] = await Promise.all([
      this.businessProfileService.obtener(),
      this.currencyService.getActiveRates(),
      this.currencyService.getBaseCurrencyCode(),
    ])

    const code = (currencyCode?.trim() || baseCode).toUpperCase()
    const rate = code === baseCode ? 1 : rates[code]
    if (rate === undefined) {
      throw new MonedaNoEncontradaException('La moneda del presupuesto no está activa.')
    }

    const quote = buildSaleQuoteDocument({
      saleId: Number(sale.id),
      customerName: sale.customer?.name ?? sale.guestName ?? 'Cliente',
      customerDocument: sale.customer?.document ?? null,
      customerPhone: sale.customer?.phone ?? null,
      lines: sale.saleLines.map((line) => ({
        description:
          line.description || line.catalogProduct?.name || line.material?.name || 'Producto',
        size: line.size,
        unit: line.catalogProduct?.saleUnit ?? line.material?.unit ?? null,
        quantity: Number(line.quantity),
        unitPriceBase: Number(line.unitPriceUsd),
        subtotalBase: Number(line.subtotalUsd),
        isWholesale: Boolean(line.isWholesale),
        unitsPerPack: line.unitsPerPack ? Number(line.unitsPerPack) : null,
      })),
      discountBase: Number(sale.discountUsd ?? 0),
      totalBase: Number(sale.totalUsd),
      baseCurrencyCode: baseCode,
      currencyCode: code,
      rate,
      validityDays: profile.quote_validity_days,
      issuedAt: nowInAppZone(),
    })

    const logo = profile.logo_path
      ? await this.businessProfileService
          .obtenerLogo()
          .then((file) => Buffer.from(file.bytes))
          .catch(() => null)
      : null

    const bytes = await renderSaleQuotePdf(quote, {
      tradeName: profile.trade_name,
      legalName: profile.legal_name,
      rif: profile.rif,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      terms: profile.quote_terms,
      accentColor: profile.use_custom_palette ? profile.palette.primary : '#1a1a1a',
      logo,
    })

    return { filename: `Presupuesto-${quote.number}.pdf`, bytes }
  }
}
