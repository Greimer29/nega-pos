import AppSetting from '#models/app_setting'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Clears transactional tables in FK-safe order for functional tests.
 * Use in group.each.setup() so suites do not leak rows into one another.
 * Restores moneda base XAU y tasas de corte (1 XAU = 100 USD).
 */
export async function resetTestDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('customer_payments').delete()
  await db.from('supplier_payments').delete()
  await db.from('order_lines').delete()
  await db.from('order_materials').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('incomes').delete()
  await db.from('machine_expenses').delete()
  await db.from('orders').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('accounts').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('app_settings').delete()
  await db.from('users').delete()

  await AppSetting.updateOrCreate(
    { key: 'base_currency_code' },
    { value: 'XAU', updatedAt: DateTime.now() }
  )

  const now = DateTime.now().toSQL({ includeOffset: false })!

  const xau = await db.from('currencies').where('code', 'XAU').first()
  if (xau) {
    await db.from('currencies').where('code', 'XAU').update({
      rate_per_usd: '1.0000',
      is_active: true,
      name: 'Oro',
    })
  } else {
    await db.table('currencies').insert({
      code: 'XAU',
      name: 'Oro',
      rate_per_usd: '1.0000',
      is_active: true,
      created_at: now,
      updated_at: now,
    })
  }

  await db.from('currencies').where('code', 'USD').update({
    rate_per_usd: '100.0000',
    is_active: true,
  })
  await db.from('currencies').where('code', 'VES').update({
    rate_per_usd: '100.0000',
    is_active: true,
  })
}
