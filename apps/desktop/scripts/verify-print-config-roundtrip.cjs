/**
 * Round-trip smoke: escribe un marcador en userData/print-config.json y lo relee.
 * Uso: node apps/desktop/scripts/verify-print-config-roundtrip.cjs
 * (requiere dist compilado: pnpm --filter desktop build:main)
 */
const { app } = require('electron')

const MARKER = '<!-- NEGA-TEST-ROUNDTRIP -->'

// Debe ir antes de ready para que userData coincida con la app real.
app.setName('Nega POS')

app.whenReady().then(() => {
  const {
    getPrintConfigPath,
    readPrintConfig,
    writePrintConfig,
  } = require('../dist/print-service.js')

  const configPath = getPrintConfigPath()
  const before = readPrintConfig()
  const formats = before.formats.map((format) => {
    if (format.id !== 'builtin-invoice') {
      return format
    }
    const body = format.bodyHtml.includes(MARKER)
      ? format.bodyHtml
      : `${format.bodyHtml}\n${MARKER}`
    return { ...format, bodyHtml: body }
  })

  writePrintConfig({ ...before, formats })
  const after = readPrintConfig()
  const invoice = after.formats.find((format) => format.id === 'builtin-invoice')
  const ok = Boolean(invoice?.bodyHtml.includes(MARKER))

  console.log(JSON.stringify({ ok, path: configPath, markerFound: ok }, null, 2))
  app.exit(ok ? 0 : 1)
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
