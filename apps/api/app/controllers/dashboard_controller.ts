import DashboardService from '#services/dashboard_service'
import { dashboardDailyClosingValidator, dashboardOverviewValidator } from '#validators/dashboard'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardControleler {
  private service = new DashboardService()

  async resumen({ serialize }: HttpContext) {
    const resumen = await this.service.resumen()

    return serialize({
      bajoStock: resumen.bajoStock,
      purchasesMonth: resumen.purchasesMonth,
      machineExpensesMonth: resumen.machineExpensesMonth,
    })
  }

  async overview({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(dashboardOverviewValidator)
    const data = await this.service.overview(filters.chart ?? 'weekly')

    return serialize({
      bajoStock: data.bajoStock,
      bajoStockProductos: data.bajoStockProductos,
      purchasesMonth: data.purchasesMonth,
      machineExpensesMonth: data.machineExpensesMonth,
      ventasDelDia: data.ventasDelDia,
      gananciaDelDia: data.gananciaDelDia,
      ventasSeries: data.ventasSeries,
      clientesCredito: data.clientesCredito,
      proveedoresCredito: data.proveedoresCredito,
    })
  }

  async dailyProductSales({ serialize }: HttpContext) {
    const data = await this.service.productosVendidosDelDia()

    return serialize({
      date: data.date,
      products: data.products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        sale_unit: product.saleUnit,
        image_path: product.imagePath,
        stock_quantity: product.stockQuantity,
        quantity_sold: product.quantitySold,
        unit_price_usd: product.unitPriceUsd,
        total_usd: product.totalUsd,
      })),
      summary: {
        productos_vendidos: data.summary.productosVendidos,
        monto_productos_usd: data.summary.montoProductosUsd,
      },
    })
  }

  async dailyExpenses({ serialize }: HttpContext) {
    const data = await this.service.gastosDelDiaDetalle()

    return serialize({
      date: data.date,
      items: data.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        description: item.description,
        amount_usd: item.amountUsd,
        machine_name: item.machineName,
        category: item.category,
      })),
      summary: {
        gastos_cantidad: data.summary.gastosCantidad,
        gastos_monto_usd: data.summary.gastosMontoUsd,
      },
    })
  }

  async dailyClosing({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(dashboardDailyClosingValidator)
    const data = await this.service.cierreDiario({
      salesShiftId: filters.sales_shift_id,
      date: filters.date,
    })

    return serialize({
      date: data.date,
      summary: {
        invoices_count: data.summary.invoicesCount,
        returns_count: data.summary.returnsCount,
        cash_total_usd: data.summary.cashTotalUsd,
        credit_total_usd: data.summary.creditTotalUsd,
        products_sold: data.summary.productsSold,
        products_amount_usd: data.summary.productsAmountUsd,
        expenses_count: data.summary.expensesCount,
        expenses_total_usd: data.summary.expensesTotalUsd,
        net_cash_usd: data.summary.netCashUsd,
      },
      by_payment_method: data.byPaymentMethod.map((item) => ({
        code: item.code,
        name: item.name,
        currency_code: item.currencyCode,
        sales_count: item.salesCount,
        total_usd: item.totalUsd,
        total_in_currency: item.totalInCurrency,
      })),
      products: data.products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        sale_unit: product.saleUnit,
        image_path: product.imagePath,
        stock_quantity: product.stockQuantity,
        quantity_sold: product.quantitySold,
        unit_price_usd: product.unitPriceUsd,
        total_usd: product.totalUsd,
      })),
      invoices: data.invoices.map((invoice) => ({
        id: invoice.id,
        code: invoice.code,
        customer_name: invoice.customerName,
        payment_type: invoice.paymentType,
        payment_method_code: invoice.paymentMethodCode,
        payment_method_name: invoice.paymentMethodName,
        total_usd: invoice.totalUsd,
        total_bs: invoice.totalBs,
        status: invoice.status,
      })),
      returns: data.returns.map((item) => ({
        sale_id: item.saleId,
        sale_code: item.saleCode,
        returned_at: item.returnedAt,
        total_returned_usd: item.totalReturnedUsd,
      })),
      expenses: {
        items: data.expenses.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          description: item.description,
          amount_usd: item.amountUsd,
          machine_name: item.machineName,
          category: item.category,
        })),
        summary: {
          gastos_cantidad: data.expenses.summary.gastosCantidad,
          gastos_monto_usd: data.expenses.summary.gastosMontoUsd,
        },
      },
    })
  }
}
