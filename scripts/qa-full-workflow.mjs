/**
 * QA integral API — flujo inventario / ventas / compras / reportes.
 *
 * Uso:
 *   node scripts/qa-full-workflow.mjs
 *   node scripts/qa-full-workflow.mjs --base-url=http://localhost:3333 --report=QA_REPORT.md
 *
 * Requiere: API en :3333, MySQL nega_pos, credenciales en apps/api/.env
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? 'true']
  })
)

function loadEnvFile(filePath) {
  const env = {}
  try {
    const content = readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  } catch {
    // ignore
  }
  return env
}

const apiEnv = loadEnvFile(resolve(REPO_ROOT, 'apps/api/.env'))
const baseUrl = (args['base-url'] ?? 'http://localhost:3333').replace(/\/$/, '')
const reportPath = resolve(REPO_ROOT, args.report ?? 'QA_REPORT.md')
const email = args.email ?? apiEnv.ADMIN_EMAIL ?? 'admin@negapos.local'
const password = args.password ?? apiEnv.ADMIN_PASSWORD ?? 'change-me-in-production'

const QA_DATE = new Date().toISOString().slice(0, 10)
const QA_STAMP = Date.now().toString().slice(-8)
const QA_PREFIX = `QA-${QA_STAMP}`

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

/** @type {Map<string, { method: string, template: string, status: string, result: string, notes: string }>} */
const endpointMatrix = new Map()
const failures = []
const checkpoints = []
const createdIds = {}

const ALL_TEMPLATES = [
  ['GET', '/health'],
  ['GET', '/api/v1/csrf'],
  ['POST', '/api/v1/auth/login'],
  ['POST', '/api/v1/auth/logout'],
  ['GET', '/api/v1/auth/me'],
  ['GET', '/api/v1/customers'],
  ['GET', '/api/v1/customers/:id/account-statement'],
  ['GET', '/api/v1/customers/:id'],
  ['POST', '/api/v1/customers'],
  ['PUT', '/api/v1/customers/:id'],
  ['DELETE', '/api/v1/customers/:id'],
  ['POST', '/api/v1/customers/:id/image'],
  ['GET', '/api/v1/customers/:id/image'],
  ['DELETE', '/api/v1/customers/:id/image'],
  ['POST', '/api/v1/customers/:id/payments'],
  ['GET', '/api/v1/orders'],
  ['GET', '/api/v1/orders/:id'],
  ['POST', '/api/v1/orders'],
  ['PUT', '/api/v1/orders/:id'],
  ['DELETE', '/api/v1/orders/:id'],
  ['POST', '/api/v1/orders/:id/transition'],
  ['POST', '/api/v1/orders/:id/return'],
  ['POST', '/api/v1/orders/:id/materials'],
  ['PUT', '/api/v1/orders/:id/materials/:pmId'],
  ['DELETE', '/api/v1/orders/:id/materials/:pmId'],
  ['POST', '/api/v1/orders/:id/lines'],
  ['PUT', '/api/v1/orders/:id/lines/:lineId'],
  ['DELETE', '/api/v1/orders/:id/lines/:lineId'],
  ['GET', '/api/v1/orders/:id/budget'],
  ['GET', '/api/v1/orders/:id/material-availability'],
  ['POST', '/api/v1/orders/:id/reference'],
  ['GET', '/api/v1/orders/:id/reference'],
  ['GET', '/api/v1/suppliers'],
  ['GET', '/api/v1/suppliers/:id'],
  ['POST', '/api/v1/suppliers'],
  ['PUT', '/api/v1/suppliers/:id'],
  ['DELETE', '/api/v1/suppliers/:id'],
  ['POST', '/api/v1/suppliers/:id/image'],
  ['GET', '/api/v1/suppliers/:id/image'],
  ['DELETE', '/api/v1/suppliers/:id/image'],
  ['GET', '/api/v1/suppliers/:id/account-statement'],
  ['POST', '/api/v1/suppliers/:id/payments'],
  ['GET', '/api/v1/materials'],
  ['GET', '/api/v1/materials/:id'],
  ['POST', '/api/v1/materials'],
  ['PUT', '/api/v1/materials/:id'],
  ['DELETE', '/api/v1/materials/:id'],
  ['POST', '/api/v1/materials/:id/adjustment'],
  ['GET', '/api/v1/materials/:id/price-history'],
  ['POST', '/api/v1/materials/:id/image'],
  ['GET', '/api/v1/materials/:id/image'],
  ['DELETE', '/api/v1/materials/:id/image'],
  ['GET', '/api/v1/purchases/summary'],
  ['GET', '/api/v1/purchases'],
  ['GET', '/api/v1/purchases/:id'],
  ['POST', '/api/v1/purchases'],
  ['PUT', '/api/v1/purchases/:id'],
  ['DELETE', '/api/v1/purchases/:id'],
  ['POST', '/api/v1/purchases/:id/confirm'],
  ['POST', '/api/v1/purchases/:id/return'],
  ['POST', '/api/v1/purchases/:id/invoice'],
  ['GET', '/api/v1/purchases/:id/invoice'],
  ['POST', '/api/v1/purchases/:id/items'],
  ['PUT', '/api/v1/purchases/:id/items/:itemId'],
  ['DELETE', '/api/v1/purchases/:id/items/:itemId'],
  ['GET', '/api/v1/expenses/summary'],
  ['GET', '/api/v1/expenses'],
  ['POST', '/api/v1/expenses'],
  ['PUT', '/api/v1/expenses/:id'],
  ['DELETE', '/api/v1/expenses/:id'],
  ['GET', '/api/v1/accounts'],
  ['GET', '/api/v1/accounts/:id'],
  ['POST', '/api/v1/accounts'],
  ['PUT', '/api/v1/accounts/:id'],
  ['DELETE', '/api/v1/accounts/:id'],
  ['GET', '/api/v1/currencies'],
  ['POST', '/api/v1/currencies'],
  ['PUT', '/api/v1/currencies/:code'],
  ['DELETE', '/api/v1/currencies/:code'],
  ['GET', '/api/v1/payment-methods'],
  ['POST', '/api/v1/payment-methods'],
  ['PUT', '/api/v1/payment-methods/:code'],
  ['DELETE', '/api/v1/payment-methods/:code'],
  ['GET', '/api/v1/categories'],
  ['POST', '/api/v1/categories'],
  ['PUT', '/api/v1/categories/:id'],
  ['DELETE', '/api/v1/categories/:id'],
  ['GET', '/api/v1/reports/account-statement'],
  ['GET', '/api/v1/settings/exchange-rate'],
  ['PUT', '/api/v1/settings/exchange-rate'],
  ['GET', '/api/v1/settings/profit-margin'],
  ['PUT', '/api/v1/settings/profit-margin'],
  ['GET', '/api/v1/settings/general'],
  ['PUT', '/api/v1/settings/general'],
  ['POST', '/api/v1/settings/general/logo'],
  ['GET', '/api/v1/settings/general/logo'],
  ['DELETE', '/api/v1/settings/general/logo'],
  ['GET', '/api/v1/dashboard/summary'],
  ['GET', '/api/v1/dashboard/overview'],
  ['GET', '/api/v1/dashboard/daily-product-sales'],
  ['GET', '/api/v1/dashboard/daily-expenses'],
  ['GET', '/api/v1/dashboard/daily-closing'],
  ['GET', '/api/v1/machines'],
  ['GET', '/api/v1/machines/:id'],
  ['POST', '/api/v1/machines'],
  ['PUT', '/api/v1/machines/:id'],
  ['DELETE', '/api/v1/machines/:id'],
  ['GET', '/api/v1/machines/:id/expenses'],
  ['POST', '/api/v1/machines/:id/expenses'],
  ['GET', '/api/v1/machine-expenses'],
  ['PUT', '/api/v1/machine-expenses/:id'],
  ['DELETE', '/api/v1/machine-expenses/:id'],
  ['POST', '/api/v1/machine-expenses/:id/receipt'],
  ['GET', '/api/v1/machine-expenses/:id/receipt'],
  ['GET', '/api/v1/catalog-products'],
  ['POST', '/api/v1/catalog-products/apply-profit-margin'],
  ['GET', '/api/v1/catalog-products/:id'],
  ['POST', '/api/v1/catalog-products/:id/adjustment'],
  ['POST', '/api/v1/catalog-products'],
  ['PUT', '/api/v1/catalog-products/:id'],
  ['DELETE', '/api/v1/catalog-products/:id'],
  ['POST', '/api/v1/catalog-products/:id/image'],
  ['GET', '/api/v1/catalog-products/:id/image'],
  ['DELETE', '/api/v1/catalog-products/:id/image'],
  ['GET', '/api/v1/formulas'],
  ['GET', '/api/v1/formulas/:id'],
  ['POST', '/api/v1/formulas'],
  ['PUT', '/api/v1/formulas/:id'],
  ['DELETE', '/api/v1/formulas/:id'],
  ['GET', '/api/v1/formulas/:id/materials'],
  ['PUT', '/api/v1/formulas/:id/materials'],
  ['GET', '/api/v1/users'],
  ['GET', '/api/v1/users/:id'],
  ['POST', '/api/v1/users'],
  ['PUT', '/api/v1/users/:id'],
  ['PATCH', '/api/v1/users/:id/active'],
  ['GET', '/api/v1/sales/next-code'],
  ['GET', '/api/v1/sales'],
  ['GET', '/api/v1/sales/:id'],
  ['POST', '/api/v1/sales'],
  ['PUT', '/api/v1/sales/:id'],
  ['DELETE', '/api/v1/sales/:id'],
  ['POST', '/api/v1/sales/:id/confirm'],
  ['POST', '/api/v1/sales/:id/transition'],
  ['POST', '/api/v1/sales/:id/return'],
]

for (const [method, template] of ALL_TEMPLATES) {
  endpointMatrix.set(`${method} ${template}`, {
    method,
    template,
    status: '-',
    result: 'SKIP',
    notes: 'No ejecutado',
  })
}

function matrixKey(method, template) {
  return `${method} ${template}`
}

function recordResult(method, template, status, ok, notes = '') {
  const key = matrixKey(method, template)
  const entry = endpointMatrix.get(key)
  if (entry) {
    entry.status = String(status)
    entry.result = ok ? 'PASS' : 'FAIL'
    entry.notes = notes
  }
  if (!ok) {
    failures.push({ method, template, status, notes })
  }
}

function checkpoint(name, expected, actual) {
  const numExpected = Number(expected)
  const numActual = Number(actual)
  const ok =
    typeof expected === 'number' || !Number.isNaN(numExpected)
      ? Math.abs(numExpected - numActual) < 0.05
      : String(expected) === String(actual)
  checkpoints.push({ name, expected: String(expected), actual: String(actual), ok })
  return ok
}

function dig(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

function pickId(res, paths) {
  for (const path of paths) {
    const value = dig(res.data, path)
    if (value != null && !Number.isNaN(Number(value))) {
      return Number(value)
    }
  }
  return null
}

class ApiClient {
  constructor(base) {
    this.base = base.replace(/\/$/, '')
    this.apiBase = `${this.base}/api/v1`
    this.cookies = []
    this.csrfToken = null
  }

  applySetCookie(response) {
    const setCookies =
      typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    if (setCookies.length === 0) {
      const single = response.headers.get('set-cookie')
      if (single) setCookies.push(single)
    }
    for (const cookie of setCookies) {
      const pair = cookie.split(';')[0]
      const name = pair.split('=')[0]
      this.cookies = this.cookies.filter((item) => !item.startsWith(`${name}=`))
      this.cookies.push(pair)
    }
  }

  async rawRequest(method, url, { body, headers = {}, isMultipart = false } = {}) {
    const finalHeaders = { Accept: 'application/json', ...headers }
    if (!isMultipart && body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json'
    }
    if (this.cookies.length > 0) {
      finalHeaders.Cookie = this.cookies.join('; ')
    }

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body,
    })

    this.applySetCookie(response)

    const contentType = response.headers.get('content-type') ?? ''
    const text = await response.text()
    let data = null
    if (text) {
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text)
        } catch {
          data = text
        }
      } else {
        data = text
      }
    }

    return { status: response.status, data, contentType }
  }

  async fetchCsrf() {
    const res = await this.rawRequest('GET', `${this.apiBase}/csrf`)
    this.csrfToken = res.data?.data?.csrf_token ?? res.data?.csrf_token ?? null
    recordResult('GET', '/api/v1/csrf', res.status, res.status === 200, 'token obtenido')
    return res
  }

  withCsrf(payload = {}) {
    if (!this.csrfToken) return payload
    return { ...payload, _csrf: this.csrfToken }
  }

  async call(method, template, path, { body, query, expected = [200], note = '' } = {}) {
    const url = new URL(path.startsWith('http') ? path : `${this.apiBase}${path.replace(/^\/api\/v1/, '')}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }

    let requestBody
    if (body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      requestBody = JSON.stringify(this.withCsrf(body))
    }

    const res = await this.rawRequest(method, url.toString(), { body: requestBody })
    const ok = expected.includes(res.status)
    const errMsg =
      res.data?.error?.message ??
      res.data?.message ??
      (typeof res.data === 'string' ? res.data.slice(0, 120) : '')
    recordResult(
      method,
      template,
      res.status,
      ok,
      ok ? note || 'OK' : `${errMsg || 'status inesperado'}`.slice(0, 200)
    )
    return res
  }

  async upload(template, path, fieldName, filename, buffer, extra = {}) {
    const form = new FormData()
    for (const [k, v] of Object.entries(extra)) {
      form.append(k, String(v))
    }
    if (this.csrfToken) {
      form.append('_csrf', this.csrfToken)
    }
    form.append(fieldName, new Blob([buffer], { type: 'image/png' }), filename)

    const url = `${this.apiBase}${path.replace(/^\/api\/v1/, '')}`
    const res = await this.rawRequest('POST', url, {
      body: form,
      isMultipart: true,
    })
    const ok = res.status === 200
    recordResult('POST', template, res.status, ok, ok ? 'upload OK' : JSON.stringify(res.data?.error ?? res.data).slice(0, 120))
    return res
  }

  async health() {
    const res = await this.rawRequest('GET', `${this.base}/health`)
    recordResult('GET', '/health', res.status, res.status === 200)
    return res
  }
}

const api = new ApiClient(baseUrl)
const state = {
  usdRate: 45,
  materialAStock: 0,
  materialBStock: 0,
  productStock: 0,
  purchaseTotalUsd: 0,
  saleFastTotal: 0,
  saleCreditTotal: 0,
}

async function phase0() {
  await api.health()
  await api.fetchCsrf()
  const login = await api.call('POST', '/api/v1/auth/login', '/auth/login', {
    body: { email, password },
    expected: [200],
    note: email,
  })
  if (login.status !== 200) {
    throw new Error(`Login falló (${login.status}). Verificá API y credenciales en apps/api/.env`)
  }
  await api.call('GET', '/api/v1/auth/me', '/auth/me', { note: 'sesión activa' })
}

async function phase1() {
  await api.call('GET', '/api/v1/settings/exchange-rate', '/settings/exchange-rate')
  await api.call('PUT', '/api/v1/settings/exchange-rate', '/settings/exchange-rate', {
    body: { usd_rate: state.usdRate },
  })

  await api.call('GET', '/api/v1/settings/profit-margin', '/settings/profit-margin')
  await api.call('PUT', '/api/v1/settings/profit-margin', '/settings/profit-margin', {
    body: { profit_margin_percent: 30 },
  })

  await api.call('GET', '/api/v1/settings/general', '/settings/general')
  await api.call('PUT', '/api/v1/settings/general', '/settings/general', {
    body: {
      trade_name: `${QA_PREFIX} Negocio`,
      tagline: 'QA automatizado',
      ticket_footer: 'Gracias',
      legal_name: `${QA_PREFIX} C.A.`,
      rif: `J${QA_STAMP}`,
      address: 'Av. QA 123',
      phone: '+584121234567',
      email: `qa-${QA_STAMP}@negapos.local`,
      website: 'https://negapos.local',
    },
  })

  await api.upload('/api/v1/settings/general/logo', '/settings/general/logo', 'logo', 'logo.png', PNG_BUFFER)
  await api.call('GET', '/api/v1/settings/general/logo', '/settings/general/logo', {
    expected: [200],
  })
  await api.call('DELETE', '/api/v1/settings/general/logo', '/settings/general/logo', { body: {} })

  const account = await api.call('POST', '/api/v1/accounts', '/accounts', {
    body: { name: `${QA_PREFIX} Caja`, description: 'Cuenta QA' },
  })
  createdIds.accountId = pickId(account, ['data.account.id'])

  await api.call('GET', '/api/v1/accounts', '/accounts')
  if (createdIds.accountId) {
    await api.call('GET', '/api/v1/accounts/:id', `/accounts/${createdIds.accountId}`, {
      expected: [200],
    })
    await api.call('PUT', '/api/v1/accounts/:id', `/accounts/${createdIds.accountId}`, {
      body: { name: `${QA_PREFIX} Caja Principal`, description: 'Actualizada QA' },
    })
  }

  await api.call('GET', '/api/v1/currencies', '/currencies')
  const cur = await api.call('POST', '/api/v1/currencies', '/currencies', {
    body: { code: 'EUR', name: 'Euro QA', rate_per_usd: 1.1, is_active: true },
    expected: [200, 409, 422],
  })
  if (cur.status === 200) {
    createdIds.currencyEur = 'EUR'
    await api.call('PUT', '/api/v1/currencies/:code', '/currencies/EUR', {
      body: { name: 'Euro QA', rate_per_usd: 1.12, is_active: true },
    })
  }

  await api.call('GET', '/api/v1/payment-methods', '/payment-methods')
  const pm = await api.call('POST', '/api/v1/payment-methods', '/payment-methods', {
    body: {
      code: `qa_pm_${QA_STAMP}`,
      name: 'QA Pago test',
      currency_code: 'USD',
      is_active: true,
      sort_order: 99,
    },
    expected: [200, 409, 422],
  })
  if (pm.status === 200) {
    createdIds.paymentMethodCode = pm.data?.data?.payment_method?.code
    await api.call('PUT', '/api/v1/payment-methods/:code', `/payment-methods/${createdIds.paymentMethodCode}`, {
      body: { name: 'QA Pago actualizado', is_active: true, sort_order: 98 },
    })
  }

  await api.call('GET', '/api/v1/categories', '/categories')
  const cat = await api.call('POST', '/api/v1/categories', '/categories', {
    body: { name: `${QA_PREFIX}-Cat`, active: true, sort_order: 99 },
    expected: [200, 409, 422],
  })
  createdIds.categoryId = cat.data?.data?.category?.id
  if (createdIds.categoryId) {
    await api.call('PUT', '/api/v1/categories/:id', `/categories/${createdIds.categoryId}`, {
      body: { name: `${QA_PREFIX}-Cat-2`, active: true, sort_order: 100 },
    })
  }
}

async function phase2() {
  const supplier = await api.call('POST', '/api/v1/suppliers', '/suppliers', {
    body: {
      name: `${QA_PREFIX} Proveedor Alpha`,
      rif: `J-PA-${QA_STAMP}`,
      phone: '+584129990001',
      email: `prov-${QA_STAMP}@qa.local`,
      credit_days: 30,
    },
  })
  createdIds.supplierId = pickId(supplier, ['data.supplier.id'])

  await api.call('GET', '/api/v1/suppliers', '/suppliers')
  await api.call('GET', '/api/v1/suppliers/:id', `/suppliers/${createdIds.supplierId}`)
  await api.call('PUT', '/api/v1/suppliers/:id', `/suppliers/${createdIds.supplierId}`, {
    body: { name: `${QA_PREFIX} Proveedor Alpha`, notes: 'Actualizado QA' },
  })
  await api.upload(
    '/api/v1/suppliers/:id/image',
    `/suppliers/${createdIds.supplierId}/image`,
    'image',
    'supplier.png',
    PNG_BUFFER
  )
  await api.call('GET', '/api/v1/suppliers/:id/image', `/suppliers/${createdIds.supplierId}/image`, {
    expected: [200],
  })
  await api.call('GET', '/api/v1/suppliers/:id/account-statement', `/suppliers/${createdIds.supplierId}/account-statement`, {
    query: { from: QA_DATE, to: QA_DATE },
  })

  const customer = await api.call('POST', '/api/v1/customers', '/customers', {
    body: {
      name: `${QA_PREFIX} Cliente Beta`,
      type: 'CORPORATE',
      phone: '+584129990002',
      email: `cli-${QA_STAMP}@qa.local`,
      document: `V${QA_STAMP}`,
      credit_days: 15,
    },
  })
  createdIds.customerId = pickId(customer, ['data.customer.id'])

  await api.call('GET', '/api/v1/customers', '/customers')
  await api.call('GET', '/api/v1/customers/:id', `/customers/${createdIds.customerId}`)
  await api.call('PUT', '/api/v1/customers/:id', `/customers/${createdIds.customerId}`, {
    body: { name: `${QA_PREFIX} Cliente Beta`, notes: 'Cliente QA' },
  })
  await api.upload(
    '/api/v1/customers/:id/image',
    `/customers/${createdIds.customerId}/image`,
    'image',
    'customer.png',
    PNG_BUFFER
  )
  await api.call('GET', '/api/v1/customers/:id/image', `/customers/${createdIds.customerId}/image`, {
    expected: [200],
  })
  await api.call('GET', '/api/v1/customers/:id/account-statement', `/customers/${createdIds.customerId}/account-statement`, {
    query: { from: QA_DATE, to: QA_DATE },
  })
}

async function phase3() {
  const matA = await api.call('POST', '/api/v1/materials', '/materials', {
    body: {
      code: `${QA_PREFIX}-TEL`,
      name: `${QA_PREFIX} Tela`,
      category: 'FABRIC',
      unit: 'ROL',
      minimum_stock: 1,
      default_supplier_id: createdIds.supplierId,
    },
  })
  createdIds.materialAId = pickId(matA, ['data.material.id'])

  const matB = await api.call('POST', '/api/v1/materials', '/materials', {
    body: {
      code: `${QA_PREFIX}-HIL`,
      name: `${QA_PREFIX} Hilo`,
      category: 'THREAD',
      unit: 'UND',
      minimum_stock: 1,
    },
  })
  createdIds.materialBId = pickId(matB, ['data.material.id'])

  await api.call('GET', '/api/v1/materials', '/materials')
  await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`)
  await api.call('PUT', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`, {
    body: {
      code: `${QA_PREFIX}-TEL`,
      name: `${QA_PREFIX} Tela premium`,
      category: 'FABRIC',
      unit: 'ROL',
      minimum_stock: 2,
    },
  })

  const adjA = await api.call('POST', '/api/v1/materials/:id/adjustment', `/materials/${createdIds.materialAId}/adjustment`, {
    body: { mode: 'CARGO', quantity: 10, note: 'Stock inicial QA' },
  })
  const adjB = await api.call('POST', '/api/v1/materials/:id/adjustment', `/materials/${createdIds.materialBId}/adjustment`, {
    body: { mode: 'CARGO', quantity: 50, note: 'Stock inicial QA' },
  })

  const matADetail = await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`)
  state.materialAStock = Number(matADetail.data?.data?.material?.stockActual ?? 0)
  const matBDetail = await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialBId}`)
  state.materialBStock = Number(matBDetail.data?.data?.material?.stockActual ?? 0)

  checkpoint('Stock material A tras ajuste', 10, state.materialAStock)
  checkpoint('Stock material B tras ajuste', 50, state.materialBStock)

  await api.call('GET', '/api/v1/materials/:id/price-history', `/materials/${createdIds.materialAId}/price-history`)

  await api.upload(
    '/api/v1/materials/:id/image',
    `/materials/${createdIds.materialAId}/image`,
    'image',
    'material.png',
    PNG_BUFFER
  )
  await api.call('GET', '/api/v1/materials/:id/image', `/materials/${createdIds.materialAId}/image`, {
    expected: [200],
  })

  const formula = await api.call('POST', '/api/v1/formulas', '/formulas', {
    body: { name: `${QA_PREFIX} Formula` },
  })
  createdIds.formulaId = pickId(formula, ['data.formula.id'])

  await api.call('GET', '/api/v1/formulas', '/formulas')
  await api.call('GET', '/api/v1/formulas/:id', `/formulas/${createdIds.formulaId}`)
  await api.call('PUT', '/api/v1/formulas/:id', `/formulas/${createdIds.formulaId}`, {
    body: { name: `${QA_PREFIX} Formula v2` },
  })
  await api.call('PUT', '/api/v1/formulas/:id/materials', `/formulas/${createdIds.formulaId}/materials`, {
    body: {
      items: [
        { material_id: createdIds.materialAId, quantity: 2.5 },
        { material_id: createdIds.materialBId, quantity: 0.1 },
      ],
    },
  })
  await api.call('GET', '/api/v1/formulas/:id/materials', `/formulas/${createdIds.formulaId}/materials`)

  const prodFormula = await api.call('POST', '/api/v1/catalog-products', '/catalog-products', {
    body: {
      name: `${QA_PREFIX} Producto Formula`,
      category: 'Uniforme',
      sale_unit: 'UND',
      sale_price_usd: 25,
      cost_usd: 8,
      formula_id: createdIds.formulaId,
      stock_quantity: 0,
    },
  })
  createdIds.productFormulaId = pickId(prodFormula, ['data.catalog_product.id'])

  const prodStock = await api.call('POST', '/api/v1/catalog-products', '/catalog-products', {
    body: {
      name: `${QA_PREFIX} Producto Stock`,
      category: 'Uniforme',
      sale_unit: 'UND',
      sale_price_usd: 15,
      cost_usd: 10,
      stock_quantity: 100,
      minimum_stock: 5,
    },
  })
  createdIds.productStockId = pickId(prodStock, ['data.catalog_product.id'])

  await api.call('GET', '/api/v1/catalog-products', '/catalog-products')
  await api.call('GET', '/api/v1/catalog-products/:id', `/catalog-products/${createdIds.productStockId}`)
  await api.call('PUT', '/api/v1/catalog-products/:id', `/catalog-products/${createdIds.productStockId}`, {
    body: { sale_price_usd: 15, cost_usd: 10, minimum_stock: 5 },
  })

  await api.call('POST', '/api/v1/catalog-products/apply-profit-margin', '/catalog-products/apply-profit-margin', {
    body: {
      catalog_product_ids: [createdIds.productStockId],
      profit_margin_percent: 25,
    },
  })

  await api.call('POST', '/api/v1/catalog-products/:id/adjustment', `/catalog-products/${createdIds.productStockId}/adjustment`, {
    body: { mode: 'CARGO', quantity: 5, note: 'Ajuste QA stock manual' },
  })

  const prodDetail = await api.call('GET', '/api/v1/catalog-products/:id', `/catalog-products/${createdIds.productStockId}`)
  state.productStock = Number(prodDetail.data?.data?.catalog_product?.stock_quantity ?? 0)
  checkpoint('Stock producto manual inicial', 105, state.productStock)

  await api.upload(
    '/api/v1/catalog-products/:id/image',
    `/catalog-products/${createdIds.productStockId}/image`,
    'image',
    'product.png',
    PNG_BUFFER
  )
  await api.call('GET', '/api/v1/catalog-products/:id/image', `/catalog-products/${createdIds.productStockId}/image`, {
    expected: [200],
  })

  if (!createdIds.productStockId || !createdIds.productFormulaId) {
    throw new Error('No se pudieron crear productos de catálogo (revisar categoría y fórmula)')
  }
}

async function phase4() {
  const purchaseDraft = await api.call('POST', '/api/v1/purchases', '/purchases', {
    body: {
      supplier_id: createdIds.supplierId,
      date: QA_DATE,
      date_recepcion: QA_DATE,
      usd_rate: state.usdRate,
      account_id: createdIds.accountId,
      notes: 'Compra QA principal',
    },
  })
  createdIds.purchaseId = pickId(purchaseDraft, ['data.purchase.id'])

  const itemMat = await api.call('POST', '/api/v1/purchases/:id/items', `/purchases/${createdIds.purchaseId}/items`, {
    body: { material_id: createdIds.materialAId, quantity: 50, unit_price_usd: 5 },
  })
  createdIds.purchaseItemMatId = pickId(itemMat, ['data.item.id'])

  const itemProd = await api.call('POST', '/api/v1/purchases/:id/items', `/purchases/${createdIds.purchaseId}/items`, {
    body: { catalog_product_id: createdIds.productStockId, quantity: 20, unit_price_usd: 10 },
  })
  createdIds.purchaseItemProdId = pickId(itemProd, ['data.item.id'])

  await api.call('PUT', '/api/v1/purchases/:id/items/:itemId', `/purchases/${createdIds.purchaseId}/items/${createdIds.purchaseItemMatId}`, {
    body: { quantity: 50, unit_price_usd: 5 },
  })

  await api.call('PUT', '/api/v1/purchases/:id', `/purchases/${createdIds.purchaseId}`, {
    body: {
      supplier_id: createdIds.supplierId,
      date: QA_DATE,
      invoice_number: `${QA_PREFIX}-FAC-001`,
      is_credit: true,
      credit_due_date: QA_DATE,
      usd_rate: state.usdRate,
      account_id: createdIds.accountId,
    },
  })

  await api.upload(
    '/api/v1/purchases/:id/invoice',
    `/purchases/${createdIds.purchaseId}/invoice`,
    'factura',
    'factura.png',
    PNG_BUFFER
  )

  const confirm = await api.call('POST', '/api/v1/purchases/:id/confirm', `/purchases/${createdIds.purchaseId}/confirm`, {
    body: {
      invoice_number: `${QA_PREFIX}-FAC-001`,
      is_credit: true,
      credit_due_date: QA_DATE,
      usd_rate: state.usdRate,
    },
  })

  state.purchaseTotalUsd = Number(
    confirm.data?.data?.purchase?.totalUsd ?? confirm.data?.data?.purchase?.total_usd ?? 0
  )
  const expectedPurchaseTotal = 50 * 5 + 20 * 10
  checkpoint('Total compra USD', expectedPurchaseTotal, state.purchaseTotalUsd)

  const matAfterPurchase = await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`)
  const stockAfterPurchase = Number(matAfterPurchase.data?.data?.material?.stockActual ?? 0)
  checkpoint('Stock material A tras compra', state.materialAStock + 50, stockAfterPurchase)
  state.materialAStock = stockAfterPurchase

  const prodAfterPurchase = await api.call('GET', '/api/v1/catalog-products/:id', `/catalog-products/${createdIds.productStockId}`)
  const stockProdAfterPurchase = Number(prodAfterPurchase.data?.data?.catalog_product?.stock_quantity ?? 0)
  checkpoint('Stock producto tras compra', state.productStock + 20, stockProdAfterPurchase)
  state.productStock = stockProdAfterPurchase

  await api.call('GET', '/api/v1/purchases/:id/invoice', `/purchases/${createdIds.purchaseId}/invoice`, {
    expected: [200],
  })

  await api.call('GET', '/api/v1/purchases', '/purchases')
  await api.call('GET', '/api/v1/purchases/:id', `/purchases/${createdIds.purchaseId}`)
  await api.call('GET', '/api/v1/purchases/summary', '/purchases/summary', {
    query: { date_desde: QA_DATE, date_hasta: QA_DATE },
  })

  const purchaseReturn = await api.call('POST', '/api/v1/purchases', '/purchases', {
    body: {
      supplier_id: createdIds.supplierId,
      date: QA_DATE,
      invoice_number: `${QA_PREFIX}-FAC-RET`,
      usd_rate: state.usdRate,
    },
  })
  createdIds.purchaseReturnId = pickId(purchaseReturn, ['data.purchase.id'])
  await api.call('POST', '/api/v1/purchases/:id/items', `/purchases/${createdIds.purchaseReturnId}/items`, {
    body: { material_id: createdIds.materialBId, quantity: 5, unit_price_usd: 1 },
  })
  await api.call('POST', '/api/v1/purchases/:id/confirm', `/purchases/${createdIds.purchaseReturnId}/confirm`, {
    body: { invoice_number: `${QA_PREFIX}-FAC-RET`, usd_rate: state.usdRate },
  })
  await api.call('POST', '/api/v1/purchases/:id/return', `/purchases/${createdIds.purchaseReturnId}/return`, {
    body: {},
    expected: [200, 409, 422],
  })
}

async function phase5() {
  const orderDraft = await api.call('POST', '/api/v1/orders', '/orders', {
    body: {
      customer_id: createdIds.customerId,
      modality: 'CORPORATE',
      description: `${QA_PREFIX} Pedido corporativo`,
      total_quantity: 10,
      order_date: QA_DATE,
      payment_type: 'CASH',
    },
  })
  createdIds.orderId = pickId(orderDraft, ['data.order.id'])

  const line = await api.call('POST', '/api/v1/orders/:id/lines', `/orders/${createdIds.orderId}/lines`, {
    body: { catalog_product_id: createdIds.productFormulaId, quantity: 10 },
  })
  createdIds.orderLineId = pickId(line, ['data.order_line.id', 'data.line.id'])

  const om = await api.call('POST', '/api/v1/orders/:id/materials', `/orders/${createdIds.orderId}/materials`, {
    body: { material_id: createdIds.materialBId, quantity_per_garment: 0.05 },
  })
  createdIds.orderMaterialId = pickId(om, ['data.orderMaterial.id', 'data.order_material.id'])

  await api.call('PUT', '/api/v1/orders/:id/materials/:pmId', `/orders/${createdIds.orderId}/materials/${createdIds.orderMaterialId}`, {
    body: { quantity_per_garment: 0.05 },
  })

  await api.call('GET', '/api/v1/orders/:id/budget', `/orders/${createdIds.orderId}/budget`)
  await api.call('GET', '/api/v1/orders/:id/material-availability', `/orders/${createdIds.orderId}/material-availability`)

  await api.upload(
    '/api/v1/orders/:id/reference',
    `/orders/${createdIds.orderId}/reference`,
    'referencia',
    'ref.png',
    PNG_BUFFER
  )
  await api.call('GET', '/api/v1/orders/:id/reference', `/orders/${createdIds.orderId}/reference`, {
    expected: [200],
  })

  await api.call('PUT', '/api/v1/orders/:id', `/orders/${createdIds.orderId}`, {
    body: {
      customer_id: createdIds.customerId,
      modality: 'CORPORATE',
      description: `${QA_PREFIX} Pedido actualizado`,
      total_quantity: 10,
      order_date: QA_DATE,
    },
  })

  await api.call('POST', '/api/v1/orders/:id/transition', `/orders/${createdIds.orderId}/transition`, {
    body: { new_status: 'CONFIRMED', payment_type: 'CASH' },
  })

  const stockBeforeProd = Number(
    (await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`)).data?.data?.material
      ?.stockActual ?? 0
  )

  await api.call('POST', '/api/v1/orders/:id/transition', `/orders/${createdIds.orderId}/transition`, {
    body: { new_status: 'IN_PRODUCTION' },
  })

  const stockAfterProd = Number(
    (await api.call('GET', '/api/v1/materials/:id', `/materials/${createdIds.materialAId}`)).data?.data?.material
      ?.stockActual ?? 0
  )
  const expectedConsumption = 10 * 2.5
  checkpoint('Consumo material A en producción', stockBeforeProd - expectedConsumption, stockAfterProd)

  await api.call('POST', '/api/v1/orders/:id/transition', `/orders/${createdIds.orderId}/transition`, {
    body: { new_status: 'DELIVERED' },
  })

  await api.call('GET', '/api/v1/orders', '/orders')
  await api.call('GET', '/api/v1/orders/:id', `/orders/${createdIds.orderId}`)

  const orderForReturn = await api.call('POST', '/api/v1/orders', '/orders', {
    body: {
      customer_id: createdIds.customerId,
      modality: 'CORPORATE',
      description: `${QA_PREFIX} Pedido devolución`,
      total_quantity: 2,
      order_date: QA_DATE,
      lines: [{ catalog_product_id: createdIds.productFormulaId, quantity: 2 }],
    },
  })
  createdIds.orderReturnId = pickId(orderForReturn, ['data.order.id'])
  if (createdIds.orderReturnId) {
    await api.call('POST', '/api/v1/orders/:id/transition', `/orders/${createdIds.orderReturnId}/transition`, {
      body: { new_status: 'DELIVERED', payment_type: 'CASH' },
    })
    const orderReturnDetail = await api.call('GET', '/api/v1/orders/:id', `/orders/${createdIds.orderReturnId}`)
    const orderReturnLines =
      orderReturnDetail.data?.data?.order?.lines ??
      orderReturnDetail.data?.data?.order?.order_lines ??
      []
    if (orderReturnLines.length > 0) {
      await api.call('POST', '/api/v1/orders/:id/return', `/orders/${createdIds.orderReturnId}/return`, {
        body: { lines: [{ line_id: orderReturnLines[0].id, quantity: 1 }] },
        expected: [200, 409, 422],
      })
    } else {
      recordResult('POST', '/api/v1/orders/:id/return', '-', false, 'Sin líneas para devolver')
    }
  }

  const orderDraftCrud = await api.call('POST', '/api/v1/orders', '/orders', {
    body: {
      guest_name: 'Borrador QA',
      modality: 'WHITE_LABEL',
      description: 'Pedido borrador CRUD',
      total_quantity: 2,
      order_date: QA_DATE,
    },
  })
  const draftOrderCrudId = pickId(orderDraftCrud, ['data.order.id'])
  if (draftOrderCrudId && createdIds.productStockId) {
    const draftLine = await api.call('POST', '/api/v1/orders/:id/lines', `/orders/${draftOrderCrudId}/lines`, {
      body: { catalog_product_id: createdIds.productStockId, quantity: 2 },
    })
    const draftLineId = pickId(draftLine, ['data.order_line.id'])
    if (draftLineId) {
      await api.call('PUT', '/api/v1/orders/:id/lines/:lineId', `/orders/${draftOrderCrudId}/lines/${draftLineId}`, {
        body: { quantity: 2 },
      })
      await api.call('DELETE', '/api/v1/orders/:id/lines/:lineId', `/orders/${draftOrderCrudId}/lines/${draftLineId}`, {
        body: {},
      })
    }
    const draftOm = await api.call('POST', '/api/v1/orders/:id/materials', `/orders/${draftOrderCrudId}/materials`, {
      body: { material_id: createdIds.materialBId, quantity_per_garment: 0.01 },
    })
    const draftOmId = pickId(draftOm, ['data.orderMaterial.id'])
    if (draftOmId) {
      await api.call('DELETE', '/api/v1/orders/:id/materials/:pmId', `/orders/${draftOrderCrudId}/materials/${draftOmId}`, {
        body: {},
      })
    }
    await api.call('DELETE', '/api/v1/orders/:id', `/orders/${draftOrderCrudId}`, { body: {} })
  }
}

async function phase6() {
  await api.call('PUT', '/api/v1/customers/:id', `/customers/${createdIds.customerId}`, {
    body: {
      name: `${QA_PREFIX} Cliente Beta`,
      type: 'CORPORATE',
      credit_days: 15,
    },
  })

  await api.call('GET', '/api/v1/sales/next-code', '/sales/next-code')

  const saleFast = await api.call('POST', '/api/v1/sales', '/sales', {
    body: {
      customer_id: createdIds.customerId,
      payment_method_code: 'cash_usd',
      billing_mode: 'FAST',
      payment_type: 'CASH',
      usd_rate: state.usdRate,
      lines: [{ catalog_product_id: createdIds.productStockId, quantity: 3, unit_price_usd: 15 }],
    },
  })
  createdIds.saleFastId = pickId(saleFast, ['data.sale.id'])
  state.saleFastTotal = 3 * 15

  if (createdIds.saleFastId) {
    const confirmFast = await api.call('POST', '/api/v1/sales/:id/confirm', `/sales/${createdIds.saleFastId}/confirm`, {
      body: { payment_method_code: 'cash_usd', payment_type: 'CASH', billing_mode: 'FAST' },
    })
    checkpoint(
      'Total venta FAST',
      state.saleFastTotal,
      Number(confirmFast.data?.data?.sale?.total_usd ?? confirmFast.data?.data?.sale?.totalUsd ?? 0)
    )
  }

  const prodAfterSale = await api.call('GET', '/api/v1/catalog-products/:id', `/catalog-products/${createdIds.productStockId}`)
  const stockAfterSale = Number(prodAfterSale.data?.data?.catalog_product?.stock_quantity ?? 0)
  if (createdIds.saleFastId) {
    checkpoint('Stock producto tras venta FAST', state.productStock - 3, stockAfterSale)
  }
  state.productStock = stockAfterSale

  const saleCredit = await api.call('POST', '/api/v1/sales', '/sales', {
    body: {
      customer_id: createdIds.customerId,
      billing_mode: 'ORDER',
      payment_type: 'CREDIT',
      usd_rate: state.usdRate,
      lines: [{ catalog_product_id: createdIds.productFormulaId, quantity: 2, unit_price_usd: 25 }],
    },
  })
  createdIds.saleCreditId = pickId(saleCredit, ['data.sale.id'])
  state.saleCreditTotal = 2 * 25

  if (createdIds.saleCreditId) {
    const confirmCredit = await api.call('POST', '/api/v1/sales/:id/confirm', `/sales/${createdIds.saleCreditId}/confirm`, {
      body: { payment_type: 'CREDIT', billing_mode: 'ORDER' },
    })
    checkpoint(
      'Total venta crédito',
      state.saleCreditTotal,
      Number(confirmCredit.data?.data?.sale?.total_usd ?? confirmCredit.data?.data?.sale?.totalUsd ?? 0)
    )
    checkpoint(
      'Saldo venta crédito',
      state.saleCreditTotal,
      Number(confirmCredit.data?.data?.sale?.balance_usd ?? confirmCredit.data?.data?.sale?.balanceUsd ?? 0)
    )
  }

  if (createdIds.saleCreditId) {
    await api.call('POST', '/api/v1/sales/:id/transition', `/sales/${createdIds.saleCreditId}/transition`, {
      body: { order_status: 'IN_PROCESS' },
    })
    await api.call('POST', '/api/v1/sales/:id/transition', `/sales/${createdIds.saleCreditId}/transition`, {
      body: { order_status: 'DELIVERED' },
    })
  }

  if (createdIds.saleFastId) {
    const saleFastDetail = await api.call('GET', '/api/v1/sales/:id', `/sales/${createdIds.saleFastId}`)
    const saleLines =
      saleFastDetail.data?.data?.sale?.sale_lines ??
      saleFastDetail.data?.data?.sale?.lines ??
      []
    const lineId = saleLines[0]?.id
    if (lineId) {
      await api.call('POST', '/api/v1/sales/:id/return', `/sales/${createdIds.saleFastId}/return`, {
        body: { lines: [{ line_id: lineId, quantity: 1 }] },
        expected: [200, 409, 422],
      })
    }
  }

  await api.call('GET', '/api/v1/sales', '/sales', { query: { date_from: QA_DATE, date_to: QA_DATE } })
  if (createdIds.saleCreditId) {
    await api.call('GET', '/api/v1/sales/:id', `/sales/${createdIds.saleCreditId}`)
  }

  const saleDraft = await api.call('POST', '/api/v1/sales', '/sales', {
    body: {
      guest_name: 'Borrador venta',
      billing_mode: 'FAST',
      payment_type: 'CASH',
      lines: [{ catalog_product_id: createdIds.productStockId, quantity: 1, unit_price_usd: 10 }],
    },
  })
  const draftSaleId = pickId(saleDraft, ['data.sale.id'])
  if (draftSaleId) {
    await api.call('PUT', '/api/v1/sales/:id', `/sales/${draftSaleId}`, {
      body: {
        guest_name: 'Borrador actualizado',
        lines: [{ catalog_product_id: createdIds.productStockId, quantity: 1, unit_price_usd: 10 }],
      },
    })
    await api.call('DELETE', '/api/v1/sales/:id', `/sales/${draftSaleId}`, { body: {} })
  }
}

async function phase7() {
  if (createdIds.saleCreditId) {
    await api.call('POST', '/api/v1/customers/:id/payments', `/customers/${createdIds.customerId}/payments`, {
      body: {
        sale_id: createdIds.saleCreditId,
        account_id: createdIds.accountId,
        amount_usd: 20,
        date: QA_DATE,
        note: 'Abono QA cliente',
      },
    })
  } else {
    recordResult('POST', '/api/v1/customers/:id/payments', '-', false, 'Venta crédito no creada')
  }

  const custStmt = await api.call('GET', '/api/v1/customers/:id/account-statement', `/customers/${createdIds.customerId}/account-statement`, {
    query: { from: QA_DATE, to: QA_DATE },
  })
  const saldoCliente = Number(dig(custStmt.data, 'data.summary.balance_usd') ?? dig(custStmt.data, 'data.saldo_pendiente_usd') ?? NaN)
  if (!Number.isNaN(saldoCliente)) {
    checkpoint('Saldo cliente tras abono', state.saleCreditTotal - 20, saldoCliente)
  }

  await api.call('POST', '/api/v1/suppliers/:id/payments', `/suppliers/${createdIds.supplierId}/payments`, {
    body: {
      purchase_id: createdIds.purchaseId,
      account_id: createdIds.accountId,
      amount_usd: 100,
      date: QA_DATE,
      note: 'Abono QA proveedor',
    },
  })

  const supStmt = await api.call('GET', '/api/v1/suppliers/:id/account-statement', `/suppliers/${createdIds.supplierId}/account-statement`, {
    query: { from: QA_DATE, to: QA_DATE },
  })
  const saldoProveedor = Number(dig(supStmt.data, 'data.summary.balance_usd') ?? dig(supStmt.data, 'data.saldo_pendiente_usd') ?? NaN)
  if (!Number.isNaN(saldoProveedor)) {
    checkpoint('Saldo proveedor tras abono', state.purchaseTotalUsd - 100, saldoProveedor)
  }
}

async function phase8() {
  const expense = await api.call('POST', '/api/v1/expenses', '/expenses', {
    body: {
      date: QA_DATE,
      description: `${QA_PREFIX} Gasto operativo`,
      amount_usd: 35.5,
      currency_code: 'USD',
      account_id: createdIds.accountId,
    },
  })
  createdIds.expenseId = pickId(expense, ['data.expense.id'])

  await api.call('GET', '/api/v1/expenses', '/expenses')
  await api.call('PUT', '/api/v1/expenses/:id', `/expenses/${createdIds.expenseId}`, {
    body: { date: QA_DATE, description: `${QA_PREFIX} Gasto actualizado`, amount_usd: 40 },
  })
  await api.call('GET', '/api/v1/expenses/summary', '/expenses/summary', {
    query: { date_from: QA_DATE, date_to: QA_DATE },
  })

  const machine = await api.call('POST', '/api/v1/machines', '/machines', {
    body: {
      name: `${QA_PREFIX} Máquina`,
      type: 'INDUSTRIAL',
      brand: 'QA',
      status: 'OPERATIONAL',
    },
  })
  createdIds.machineId = pickId(machine, ['data.machine.id'])

  await api.call('GET', '/api/v1/machines', '/machines')
  await api.call('GET', '/api/v1/machines/:id', `/machines/${createdIds.machineId}`)
  await api.call('PUT', '/api/v1/machines/:id', `/machines/${createdIds.machineId}`, {
    body: { name: `${QA_PREFIX} Máquina`, type: 'INDUSTRIAL', status: 'OPERATIONAL', location: 'Planta QA' },
  })

  const mexp = await api.call('POST', '/api/v1/machines/:id/expenses', `/machines/${createdIds.machineId}/expenses`, {
    body: {
      date: QA_DATE,
      category: 'MAINTENANCE',
      description: `${QA_PREFIX} Mantenimiento`,
      amount: 75,
      currency_code: 'USD',
      account_id: createdIds.accountId,
    },
  })
  createdIds.machineExpenseId = pickId(mexp, ['data.machine_expense.id', 'data.expense.id'])

  await api.call('GET', '/api/v1/machines/:id/expenses', `/machines/${createdIds.machineId}/expenses`)
  await api.call('GET', '/api/v1/machine-expenses', '/machine-expenses')

  if (createdIds.machineExpenseId) {
    await api.call('PUT', '/api/v1/machine-expenses/:id', `/machine-expenses/${createdIds.machineExpenseId}`, {
      body: {
        date: QA_DATE,
        category: 'MAINTENANCE',
        description: `${QA_PREFIX} Mantenimiento actualizado`,
        amount: 80,
      },
    })
    await api.upload(
      '/api/v1/machine-expenses/:id/receipt',
      `/machine-expenses/${createdIds.machineExpenseId}/receipt`,
      'comprobante',
      'receipt.png',
      PNG_BUFFER
    )
    await api.call('GET', '/api/v1/machine-expenses/:id/receipt', `/machine-expenses/${createdIds.machineExpenseId}/receipt`, {
      expected: [200],
    })
  }
}

async function phase9() {
  await api.call('GET', '/api/v1/dashboard/summary', '/dashboard/summary')
  await api.call('GET', '/api/v1/dashboard/overview', '/dashboard/overview', { query: { date: QA_DATE } })
  await api.call('GET', '/api/v1/dashboard/daily-product-sales', '/dashboard/daily-product-sales', {
    query: { date: QA_DATE },
  })
  await api.call('GET', '/api/v1/dashboard/daily-expenses', '/dashboard/daily-expenses', { query: { date: QA_DATE } })
  await api.call('GET', '/api/v1/dashboard/daily-closing', '/dashboard/daily-closing', { query: { date: QA_DATE } })

  const report = await api.call('GET', '/api/v1/reports/account-statement', '/reports/account-statement', {
    query: {
      from: QA_DATE,
      to: QA_DATE,
      account_id: createdIds.accountId,
      display_currency: 'USD',
    },
  })
  const summary = dig(report.data, 'data.summary') ?? dig(report.data, 'data.totals') ?? {}
  if (summary && Object.keys(summary).length > 0) {
    checkpoint('Reporte generado', 'object', typeof summary === 'object' ? 'object' : 'missing')
  }
}

async function phase10() {
  const operatorEmail = `qa-op-${QA_STAMP}@negapos.local`
  const userCreate = await api.call('POST', '/api/v1/users', '/users', {
    body: {
      name: `${QA_PREFIX} Operador`,
      email: operatorEmail,
      password: 'QaPass123!',
      role: 'OPERATOR',
      permissions: ['dashboard.view', 'ventas.view', 'catalog.view'],
      active: true,
    },
  })
  createdIds.operatorUserId = pickId(userCreate, ['data.user.id'])

  await api.call('GET', '/api/v1/users', '/users')
  if (createdIds.operatorUserId) {
    await api.call('GET', '/api/v1/users/:id', `/users/${createdIds.operatorUserId}`)
    await api.call('PUT', '/api/v1/users/:id', `/users/${createdIds.operatorUserId}`, {
      body: {
        name: `${QA_PREFIX} Operador`,
        email: operatorEmail,
        role: 'OPERATOR',
        permissions: ['dashboard.view', 'ventas.view'],
      },
    })
    await api.call('PATCH', '/api/v1/users/:id/active', `/users/${createdIds.operatorUserId}/active`, {
      body: { active: true },
    })
  }

  if (createdIds.expenseId) {
    await api.call('DELETE', '/api/v1/expenses/:id', `/expenses/${createdIds.expenseId}`, {
      body: {},
      expected: [200, 409],
    })
  }
  if (createdIds.machineExpenseId) {
    await api.call('DELETE', '/api/v1/machine-expenses/:id', `/machine-expenses/${createdIds.machineExpenseId}`, {
      body: {},
      expected: [200, 409],
    })
  }
  if (createdIds.machineId) {
    await api.call('DELETE', '/api/v1/machines/:id', `/machines/${createdIds.machineId}`, {
      body: {},
      expected: [200, 409],
    })
  }

  await api.call('DELETE', '/api/v1/customers/:id/image', `/customers/${createdIds.customerId}/image`, {
    body: {},
    expected: [200, 404],
  })
  await api.call('DELETE', '/api/v1/suppliers/:id/image', `/suppliers/${createdIds.supplierId}/image`, {
    body: {},
    expected: [200, 404],
  })
  await api.call('DELETE', '/api/v1/materials/:id/image', `/materials/${createdIds.materialAId}/image`, {
    body: {},
    expected: [200, 404],
  })
  await api.call('DELETE', '/api/v1/catalog-products/:id/image', `/catalog-products/${createdIds.productStockId}/image`, {
    body: {},
    expected: [200, 404],
  })

  const draftPurchase = await api.call('POST', '/api/v1/purchases', '/purchases', {
    body: { supplier_id: createdIds.supplierId, date: QA_DATE },
  })
  const draftPurchaseId = draftPurchase.data?.data?.purchase?.id
  if (draftPurchaseId) {
    const di = await api.call('POST', '/api/v1/purchases/:id/items', `/purchases/${draftPurchaseId}/items`, {
      body: { material_id: createdIds.materialBId, quantity: 1, unit_price_usd: 1 },
    })
    const draftItemId = di.data?.data?.item?.id
    if (draftItemId) {
      await api.call('PUT', '/api/v1/purchases/:id/items/:itemId', `/purchases/${draftPurchaseId}/items/${draftItemId}`, {
        body: { quantity: 2, unit_price_usd: 1 },
      })
      await api.call('DELETE', '/api/v1/purchases/:id/items/:itemId', `/purchases/${draftPurchaseId}/items/${draftItemId}`, {
        body: {},
      })
    }
    await api.call('DELETE', '/api/v1/purchases/:id', `/purchases/${draftPurchaseId}`, { body: {} })
  }

  if (createdIds.paymentMethodCode) {
    await api.call('DELETE', '/api/v1/payment-methods/:code', `/payment-methods/${createdIds.paymentMethodCode}`, {
      body: {},
      expected: [200, 409],
    })
  }
  if (createdIds.currencyEur) {
    await api.call('DELETE', '/api/v1/currencies/:code', '/currencies/EUR', { body: {}, expected: [200, 409] })
  }
  if (createdIds.categoryId) {
    await api.call('DELETE', '/api/v1/categories/:id', `/categories/${createdIds.categoryId}`, {
      body: {},
      expected: [200, 409],
    })
  }

  await api.call('POST', '/api/v1/auth/logout', '/auth/logout', { body: {} })
}

function writeReport(startedAt) {
  const rows = [...endpointMatrix.values()]
  const pass = rows.filter((r) => r.result === 'PASS').length
  const fail = rows.filter((r) => r.result === 'FAIL').length
  const skip = rows.filter((r) => r.result === 'SKIP').length
  const cpFail = checkpoints.filter((c) => !c.ok)

  const lines = [
    `# QA API — ${startedAt}`,
    '',
    `- **Entorno:** ${baseUrl} | BD \`nega_pos\` (desarrollo)`,
    `- **Prefijo datos:** \`${QA_PREFIX}\``,
    `- **Fecha operaciones:** ${QA_DATE}`,
    `- **Resumen endpoints:** ${pass} PASS / ${fail} FAIL / ${skip} SKIP de ${rows.length}`,
    `- **Checkpoints:** ${checkpoints.length - cpFail.length} OK / ${cpFail.length} FAIL`,
  ]

  if (fail > 0 || cpFail.length > 0) {
    lines.push('', '## Resultado global', '', '**FAIL** — revisar secciones siguientes.')
  } else {
    lines.push('', '## Resultado global', '', '**PASS**')
  }

  lines.push('', '## Fallos de endpoints', '', '| Método | Ruta | Status | Detalle |', '|--------|------|--------|---------|')
  if (failures.length === 0) {
    lines.push('| — | — | — | Sin fallos |')
  } else {
    for (const f of failures) {
      lines.push(`| ${f.method} | ${f.template} | ${f.status} | ${f.notes.replace(/\|/g, '/')} |`)
    }
  }

  lines.push('', '## Checkpoints financieros / inventario', '', '| Checkpoint | Esperado | Obtenido | OK |', '|------------|----------|----------|-----|')
  for (const c of checkpoints) {
    lines.push(`| ${c.name} | ${c.expected} | ${c.actual} | ${c.ok ? 'Sí' : 'No'} |`)
  }

  lines.push('', '## Matriz completa de endpoints', '', '| # | Método | Ruta | Status | Resultado | Notas |', '|---|--------|------|--------|-----------|-------|')
  rows.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.method} | ${r.template} | ${r.status} | ${r.result} | ${r.notes.replace(/\|/g, '/')} |`)
  })

  lines.push('', '## Endpoints omitidos (SKIP)', '')
  lines.push('Los siguientes `DELETE` no se ejecutan porque las entidades quedan referenciadas por el flujo QA o son maestros en uso:')
  lines.push('- `DELETE /customers/:id`, `DELETE /suppliers/:id`, `DELETE /materials/:id`')
  lines.push('- `DELETE /accounts/:id`, `DELETE /catalog-products/:id`, `DELETE /formulas/:id`')
  lines.push('')
  for (const [k, v] of Object.entries(createdIds)) {
    lines.push(`- \`${k}\`: ${v}`)
  }
  lines.push('')

  writeFileSync(reportPath, lines.join('\n'), 'utf8')
  console.log(`\nReporte: ${reportPath}`)
  console.log(`Endpoints: ${pass} PASS, ${fail} FAIL, ${skip} SKIP`)
  console.log(`Checkpoints: ${checkpoints.length - cpFail.length} OK, ${cpFail.length} FAIL`)
}

async function main() {
  const startedAt = new Date().toISOString()
  console.log(`QA Nega POS — ${baseUrl} — prefijo ${QA_PREFIX}`)

  try {
    await phase0()
    await phase1()
    await phase2()
    await phase3()
    await phase4()
    await phase5()
    await phase6()
    await phase7()
    await phase8()
    await phase9()
    await phase10()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    failures.push({ method: '-', template: '-', status: '-', notes: `Abortado: ${msg}` })
    console.error('QA abortado:', msg)
  }

  writeReport(startedAt)
  const hasFail =
    [...endpointMatrix.values()].some((r) => r.result === 'FAIL') || checkpoints.some((c) => !c.ok)
  process.exit(hasFail ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
