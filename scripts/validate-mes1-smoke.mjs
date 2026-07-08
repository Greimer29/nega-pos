/**
 * Smoke test Mes 1 — receta + stock + ciclo pedido (API HTTP).
 * Uso:
 *   node scripts/validate-mes1-smoke.mjs
 *   node scripts/validate-mes1-smoke.mjs --base-url=https://hebra-api-production.up.railway.app --mode=prod
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? 'true']
  })
)

const mode = args.mode ?? 'local'
const baseUrl = (args['base-url'] ?? 'http://localhost:3333').replace(/\/$/, '')
const email = args.email ?? 'admin@hebra.local'
const password = args.password ?? 'Hebra@2026!Admin'
const reportPath =
  args.report ??
  resolve(__dirname, '..', 'docs', mode === 'prod' ? 'VALIDACION_SMOKE_PRODUCCION.md' : 'VALIDACION_TECNICA_MES1_RECETA.md')

const results = []

function log(step, ok, detail = '') {
  results.push({ step, ok, detail })
  const mark = ok ? 'OK' : 'FAIL'
  console.log(`[${mark}] ${step}${detail ? ` — ${detail}` : ''}`)
}

class ApiClient {
  constructor(base) {
    this.base = base
    this.cookies = []
  }

  applySetCookie(response) {
    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : []

    if (setCookies.length === 0) {
      const single = response.headers.get('set-cookie')
      if (single) {
        setCookies.push(single)
      }
    }

    for (const cookie of setCookies) {
      const pair = cookie.split(';')[0]
      const name = pair.split('=')[0]
      this.cookies = this.cookies.filter((item) => !item.startsWith(`${name}=`))
      this.cookies.push(pair)
    }
  }

  async request(method, path, body) {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }
    if (this.cookies.length > 0) {
      headers.Cookie = this.cookies.join('; ')
    }

    const response = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    this.applySetCookie(response)

    let data = null
    const text = await response.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    return { status: response.status, data }
  }
}

async function main() {
  const api = new ApiClient(`${baseUrl}/api/v1`)
  const stamp = new Date().toISOString()

  log('Entorno', true, `${mode} @ ${baseUrl}`)

  const health = await fetch(`${baseUrl}/health`)
  log('Health check', health.status === 200, `status ${health.status}`)

  const login = await api.request('POST', '/auth/login', { email, password })
  log('Login', login.status === 200, login.data?.data?.user?.email ?? `status ${login.status}`)

  if (login.status !== 200) {
    writeReport(stamp)
    process.exit(1)
  }

  if (mode === 'prod') {
    await runProdSmoke(api)
    writeReport(stamp)
    process.exit(results.some((r) => !r.ok) ? 1 : 0)
  }

  await runFullLocalSmoke(api)
  writeReport(stamp)
  process.exit(results.some((r) => !r.ok) ? 1 : 0)
}

async function runProdSmoke(api) {
  const customer = await api.request('POST', '/customers', {
    name: `UAT Smoke ${Date.now()}`,
    type: 'CORPORATE',
  })
  log('Crear cliente de prueba', customer.status === 200, `id ${customer.data?.data?.customer?.id}`)
  const customerId = customer.data?.data?.customer?.id

  const order = await api.request('POST', '/orders', {
    customer_id: customerId,
    modality: 'CORPORATE',
    description: 'Pedido smoke producción — cancelar',
    total_quantity: 5,
    order_date: '2026-06-01',
  })
  log('Crear pedido borrador', order.status === 200, `id ${order.data?.data?.order?.id}`)
  const orderId = order.data?.data?.order?.id

  const material = await api.request('POST', '/materials', {
    code: `SMK-${Date.now().toString().slice(-6)}`,
    name: 'Material smoke producción',
    category: 'FABRIC',
    unit: 'METER',
    stock_minimo: 1,
    active: true,
  })
  log('Crear material de prueba', material.status === 200, `id ${material.data?.data?.material?.id}`)
  const materialId = material.data?.data?.material?.id

  const recipe = await api.request('POST', `/orders/${orderId}/materials`, {
    material_id: materialId,
    quantity_per_garment: 1,
  })
  log('Agregar material a receta', recipe.status === 200)

  const deleteOrder = await api.request('DELETE', `/orders/${orderId}`)
  log('Eliminar pedido borrador (limpieza)', deleteOrder.status === 200, `status ${deleteOrder.status}`)

  const deleteMaterial = await api.request('DELETE', `/materials/${materialId}`)
  log('Eliminar material de prueba', deleteMaterial.status === 200, `status ${deleteMaterial.status}`)

  const deleteCustomer = await api.request('DELETE', `/customers/${customerId}`)
  log('Eliminar cliente de prueba', deleteCustomer.status === 200, `status ${deleteCustomer.status}`)
}

async function runFullLocalSmoke(api) {
  const supplierList = await api.request('GET', '/suppliers')
  log('Listar proveedores (seeder)', supplierList.status === 200)

  const customer = await api.request('POST', '/customers', {
    name: 'Cliente validación Mes 1',
    type: 'CORPORATE',
  })
  const customerId = customer.data?.data?.customer?.id
  log('Crear cliente', customer.status === 200, `id ${customerId}`)

  const matA = await api.request('POST', '/materials', {
    code: 'VAL-TEL-A',
    name: 'Tela validación A',
    category: 'FABRIC',
    unit: 'METER',
    stock_minimo: 10,
    active: true,
  })
  const matB = await api.request('POST', '/materials', {
    code: 'VAL-HIL-B',
    name: 'Hilo validación B',
    category: 'THREAD',
    unit: 'UNIT',
    stock_minimo: 5,
    active: true,
  })
  const materialAId = matA.data?.data?.material?.id
  const materialBId = matB.data?.data?.material?.id
  log('Crear 2 materiales', matA.status === 200 && matB.status === 200)

  const stockA = await api.request('POST', `/materials/${materialAId}/adjustment`, {
    quantity: 500,
    note: 'Stock inicial validación',
  })
  const stockB = await api.request('POST', `/materials/${materialBId}/adjustment`, {
    quantity: 200,
    note: 'Stock inicial validación',
  })
  log('Ajustar stock inicial', stockA.status === 200 && stockB.status === 200)

  const order = await api.request('POST', '/orders', {
    customer_id: customerId,
    modality: 'CORPORATE',
    description: 'Pedido validación ciclo completo',
    total_quantity: 5,
    order_date: '2026-06-01',
  })
  const orderId = order.data?.data?.order?.id
  log('Crear pedido', order.status === 200, `id ${orderId}`)

  const recipe1 = await api.request('POST', `/orders/${orderId}/materials`, {
    material_id: materialAId,
    quantity_per_garment: 2,
  })
  const recipe2 = await api.request('POST', `/orders/${orderId}/materials`, {
    material_id: materialBId,
    quantity_per_garment: 1,
  })
  log('Agregar receta (2 materiales)', recipe1.status === 200 && recipe2.status === 200)

  const detail = await api.request('GET', `/orders/${orderId}`)
  const materialsCount = detail.data?.data?.order?.materials?.length ?? 0
  log('Detalle pedido incluye receta', detail.status === 200 && materialsCount === 2, `items ${materialsCount}`)

  const confirmed = await api.request('POST', `/orders/${orderId}/transition`, {
    new_status: 'CONFIRMED',
  })
  log('Transición a CONFIRMED', confirmed.status === 200)

  const beforeA = await api.request('GET', `/materials/${materialAId}`)
  const stockBefore = beforeA.data?.data?.material?.stockActual

  const production = await api.request('POST', `/orders/${orderId}/transition`, {
    new_status: 'IN_PRODUCTION',
  })
  log('Transición a IN_PRODUCTION', production.status === 200)

  const afterA = await api.request('GET', `/materials/${materialAId}`)
  const stockAfter = afterA.data?.data?.material?.stockActual
  const stockDropped = typeof stockBefore === 'number' && typeof stockAfter === 'number' && stockAfter < stockBefore
  log(
    'Stock bajó al producir',
    stockDropped,
    `${stockBefore} -> ${stockAfter} (esperado -10 en tela A)`
  )

  const delivered = await api.request('POST', `/orders/${orderId}/transition`, {
    new_status: 'DELIVERED',
  })
  log('Transición a DELIVERED', delivered.status === 200)

  const orderNoStock = await api.request('POST', '/orders', {
    customer_id: customerId,
    modality: 'CORPORATE',
    description: 'Pedido sin stock suficiente',
    total_quantity: 1000,
    order_date: '2026-06-01',
  })
  const orderNoStockId = orderNoStock.data?.data?.order?.id
  await api.request('POST', `/orders/${orderNoStockId}/materials`, {
    material_id: materialAId,
    quantity_per_garment: 10,
  })
  await api.request('POST', `/orders/${orderNoStockId}/transition`, { new_status: 'CONFIRMED' })

  const blocked = await api.request('POST', `/orders/${orderNoStockId}/transition`, {
    new_status: 'IN_PRODUCTION',
  })
  log(
    'Stock insuficiente devuelve 409',
    blocked.status === 409 && blocked.data?.error?.code === 'STOCK_INSUFICIENTE',
    `status ${blocked.status}`
  )

  const forced = await api.request('POST', `/orders/${orderNoStockId}/transition`, {
    new_status: 'IN_PRODUCTION',
    force: true,
  })
  log('Forzar producción sin stock', forced.status === 200)

  const orderCancel = await api.request('POST', '/orders', {
    customer_id: customerId,
    modality: 'CORPORATE',
    description: 'Pedido cancelación reversión',
    total_quantity: 10,
    order_date: '2026-06-01',
  })
  const orderCancelId = orderCancel.data?.data?.order?.id
  await api.request('POST', `/orders/${orderCancelId}/materials`, {
    material_id: materialBId,
    quantity_per_garment: 2,
  })
  await api.request('POST', `/orders/${orderCancelId}/transition`, { new_status: 'CONFIRMED' })
  await api.request('POST', `/orders/${orderCancelId}/transition`, { new_status: 'IN_PRODUCTION' })

  const stockBeforeCancel = (await api.request('GET', `/materials/${materialBId}`)).data?.data?.material
    ?.stockActual
  await api.request('POST', `/orders/${orderCancelId}/transition`, { new_status: 'CANCELLED' })
  const stockAfterCancel = (await api.request('GET', `/materials/${materialBId}`)).data?.data?.material
    ?.stockActual
  const stockReverted =
    typeof stockBeforeCancel === 'number' &&
    typeof stockAfterCancel === 'number' &&
    stockAfterCancel > stockBeforeCancel
  log(
    'Cancelación revierte stock',
    stockReverted,
    `${stockBeforeCancel} -> ${stockAfterCancel}`
  )

  const machine = await api.request('POST', '/machines', {
    name: 'Máquina validación',
    type: 'STRAIGHT_STITCH',
    brand: 'Brother',
    model: 'TEST-001',
    status: 'OPERATIONAL',
  })
  const machineId = machine.data?.data?.machine?.id
  log('Crear máquina', machine.status === 200, `id ${machineId}`)

  const expense = await api.request('POST', `/machines/${machineId}/expenses`, {
    category: 'MAINTENANCE',
    amount: 150.5,
    date: '2026-06-01',
    description: 'Gasto validación Mes 1',
  })
  log('Registrar gasto de máquina', expense.status === 200)

  const dashboard = await api.request('GET', '/dashboard/summary')
  const hasDashboard =
    dashboard.status === 200 &&
    dashboard.data?.data?.purchasesMonth != null &&
    dashboard.data?.data?.machineExpensesMonth != null
  log('Dashboard resumen', hasDashboard, `status ${dashboard.status}`)
}

function writeReport(stamp) {
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  const lines = [
    `# Validación técnica — ${mode === 'prod' ? 'Smoke producción' : 'Mes 1 receta + stock'}`,
    '',
    `- **Fecha:** ${stamp}`,
    `- **Entorno:** ${baseUrl}`,
    `- **Modo:** ${mode}`,
    `- **Resultado:** ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length} pasos OK)`,
    '',
    '## Pasos',
    '',
    '| Paso | Resultado | Detalle |',
    '|------|-----------|---------|',
    ...results.map((r) => `| ${r.step} | ${r.ok ? 'OK' : 'FAIL'} | ${r.detail.replace(/\|/g, '/')} |`),
    '',
  ]
  writeFileSync(reportPath, lines.join('\n'), 'utf8')
  console.log(`\nReporte escrito en: ${reportPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
