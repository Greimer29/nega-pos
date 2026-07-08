import {
  createSampleSale,
  renderSaleDocument,
  renderTestDocument,
} from '@/features/printing/render-document'
import type { RenderComandaOptions } from '@/features/printing/render-document'
import {
  DEFAULT_PRINT_CONFIG,
  PRINT_DOCUMENT_LABELS,
  type PrintConfig,
  type PrintDocumentKind,
  type PrinterInfo,
} from '@/features/printing/types'
import {
  groupSaleLinesByComandaPrinter,
  isComandaPrintingConfigured,
  resolveCategoryLabelForLines,
} from '@/features/printing/utils/comanda-routing'
import type { Sale } from '@/features/ventas/types'
import {
  getElectronPrintingApi,
  isElectronPrintingAvailable,
  type ElectronPrinterInfo,
} from '@/lib/electron-bridge'

export type PrintDocumentError = {
  kind: PrintDocumentKind
  message: string
}

export type PrintDocumentsResult = {
  printed: PrintDocumentKind[]
  errors: PrintDocumentError[]
}

const PRINT_JOB_DELAY_MS = 700

function mapPrinter(printer: ElectronPrinterInfo): PrinterInfo {
  return {
    name: printer.name,
    isDefault: printer.isDefault,
    status: printer.status,
  }
}

async function delayBetweenPrintJobs(jobIndex: number): Promise<void> {
  if (jobIndex > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, PRINT_JOB_DELAY_MS))
  }
}

export function isPrintingAvailable(): boolean {
  return isElectronPrintingAvailable()
}

export async function listPrinters(): Promise<PrinterInfo[]> {
  const api = getElectronPrintingApi()
  if (!api) {
    return []
  }
  const printers = await api.listPrinters()
  return printers.map(mapPrinter)
}

export async function getPrintConfig(): Promise<PrintConfig> {
  const api = getElectronPrintingApi()
  if (!api) {
    return structuredClone(DEFAULT_PRINT_CONFIG)
  }
  return api.getConfig()
}

export async function savePrintConfig(config: PrintConfig): Promise<PrintConfig> {
  const api = getElectronPrintingApi()
  if (!api) {
    throw new Error('La configuración de impresión solo está disponible en la app de escritorio.')
  }
  return api.saveConfig(config)
}

async function printSingleDocument(
  sale: Sale,
  kind: PrintDocumentKind,
  config: PrintConfig,
  deviceName: string,
  comandaOptions?: RenderComandaOptions
): Promise<void> {
  const api = getElectronPrintingApi()
  if (!api) {
    return
  }

  const docSettings = config.documents[kind]
  const rendered = renderSaleDocument(kind, sale, config, comandaOptions)

  await api.printHtml({
    html: rendered.html,
    deviceName,
    paperWidthMm: docSettings.paperWidthMm,
    jobName: rendered.title,
  })
}

async function printComandaGroups(
  sale: Sale,
  config: PrintConfig,
  printed: PrintDocumentKind[],
  errors: PrintDocumentError[],
  startJobIndex: number
): Promise<number> {
  const kind: PrintDocumentKind = 'comanda'
  const label = PRINT_DOCUMENT_LABELS[kind]
  let jobIndex = startJobIndex

  if (!isComandaPrintingConfigured(config)) {
    errors.push({ kind, message: `${label} está deshabilitado en configuración.` })
    return jobIndex
  }

  const groups = groupSaleLinesByComandaPrinter(sale, config)
  if (groups.size === 0) {
    return jobIndex
  }

  for (const [deviceName, lines] of groups) {
    await delayBetweenPrintJobs(jobIndex)
    jobIndex += 1

    const categoryLabel = resolveCategoryLabelForLines(lines)
    const printerLabel = deviceName.trim() || 'predeterminada'

    if (!deviceName.trim()) {
      errors.push({
        kind,
        message: `No hay impresora configurada para comanda (${categoryLabel ?? 'líneas sin destino'}).`,
      })
      continue
    }

    try {
      await printSingleDocument(sale, kind, config, deviceName, {
        lines,
        categoryLabel,
        printFormula:
          (config.behavior as { printComandaFormula?: boolean }).printComandaFormula ===
          true,
      })
      if (!printed.includes(kind)) {
        printed.push(kind)
      }
    } catch (error) {
      const baseMessage =
        error instanceof Error ? error.message : `No se pudo imprimir ${label.toLowerCase()}.`
      errors.push({
        kind,
        message: `${label} (${categoryLabel ?? printerLabel} → ${deviceName}): ${baseMessage}`,
      })
    }
  }

  return jobIndex
}

export async function printSaleDocuments(
  sale: Sale,
  kinds: PrintDocumentKind[],
  config?: PrintConfig
): Promise<PrintDocumentsResult> {
  const api = getElectronPrintingApi()
  if (!api || kinds.length === 0) {
    return { printed: [], errors: [] }
  }

  const resolvedConfig = config ?? (await api.getConfig())
  const printed: PrintDocumentKind[] = []
  const errors: PrintDocumentError[] = []
  let jobIndex = 0

  for (const kind of kinds) {
    if (kind === 'comanda') {
      jobIndex = await printComandaGroups(sale, resolvedConfig, printed, errors, jobIndex)
      continue
    }

    const docSettings = resolvedConfig.documents[kind]
    const label = PRINT_DOCUMENT_LABELS[kind]

    await delayBetweenPrintJobs(jobIndex)
    jobIndex += 1

    if (!docSettings.enabled) {
      errors.push({ kind, message: `${label} está deshabilitado en configuración.` })
      continue
    }

    if (!docSettings.deviceName.trim()) {
      errors.push({ kind, message: `No hay impresora configurada para ${label.toLowerCase()}.` })
      continue
    }

    try {
      await printSingleDocument(sale, kind, resolvedConfig, docSettings.deviceName)
      printed.push(kind)
    } catch (error) {
      const message = error instanceof Error ? error.message : `No se pudo imprimir ${label.toLowerCase()}.`
      errors.push({ kind, message })
    }
  }

  return { printed, errors }
}

export async function printSaleDocumentsOnConfirm(sale: Sale): Promise<PrintDocumentsResult> {
  if (!isPrintingAvailable()) {
    return { printed: [], errors: [] }
  }

  const config = await getPrintConfig()
  const kinds: PrintDocumentKind[] = []

  if (config.behavior.printInvoiceOnConfirm) {
    kinds.push('invoice')
  }

  if (config.behavior.printDeliveryNoteOnConfirm) {
    kinds.push('deliveryNote')
  }

  if (config.behavior.printComandaOnConfirm) {
    kinds.push('comanda')
  }

  return printSaleDocuments(sale, kinds, config)
}

export async function reprintSaleDocument(
  sale: Sale,
  kind: PrintDocumentKind
): Promise<PrintDocumentsResult> {
  return printSaleDocuments(sale, [kind])
}

export async function printTestDocument(kind: PrintDocumentKind): Promise<void> {
  const api = getElectronPrintingApi()
  if (!api) {
    throw new Error('La impresión de prueba solo está disponible en la app de escritorio.')
  }

  const config = await api.getConfig()
  const docSettings = config.documents[kind]
  const label = PRINT_DOCUMENT_LABELS[kind]

  if (kind === 'comanda') {
    await printTestComanda(config)
    return
  }

  if (!docSettings.deviceName.trim()) {
    throw new Error(`Seleccioná una impresora para ${label.toLowerCase()}.`)
  }

  const rendered = renderTestDocument(kind, config)
  await api.printHtml({
    html: rendered.html,
    deviceName: docSettings.deviceName,
    paperWidthMm: docSettings.paperWidthMm,
    jobName: `Prueba — ${label}`,
  })
}

async function printTestComanda(config: PrintConfig): Promise<void> {
  const api = getElectronPrintingApi()
  if (!api) {
    return
  }

  if (!isComandaPrintingConfigured(config)) {
    throw new Error(
      'Habilitá la comanda o activá el enrutamiento por categoría con al menos una impresora asignada.'
    )
  }

  const sampleSale = createSampleSaleForComandaRouting(config)
  const groups = groupSaleLinesByComandaPrinter(sampleSale, config)

  if (groups.size === 0) {
    throw new Error('No hay impresoras configuradas para la prueba de comanda.')
  }

  let jobIndex = 0
  for (const [deviceName, lines] of groups) {
    if (!deviceName.trim()) {
      throw new Error(
        `Hay categorías sin impresora (ej. ${resolveCategoryLabelForLines(lines) ?? 'sin categoría'}). Asigná una impresora en la tabla o en Comanda.`
      )
    }

    await delayBetweenPrintJobs(jobIndex)
    jobIndex += 1

    const rendered = renderSaleDocument('comanda', sampleSale, config, {
      lines,
      categoryLabel: resolveCategoryLabelForLines(lines),
      printFormula: (config.behavior as { printComandaFormula?: boolean }).printComandaFormula === true,
    })

    await api.printHtml({
      html: rendered.html,
      deviceName,
      paperWidthMm: config.documents.comanda.paperWidthMm,
      jobName: `Prueba — Comanda (${resolveCategoryLabelForLines(lines) ?? deviceName})`,
    })
  }
}

function createSampleSaleForComandaRouting(config: PrintConfig): Sale {
  const base = createSampleSale()
  const routing = config.categoryRouting.comanda

  if (!routing.enabled || routing.rules.length === 0) {
    return base
  }

  const lines = routing.rules
    .filter((rule) => rule.category.trim() && rule.deviceName.trim())
    .map((rule, index) => ({
      id: index + 1,
      catalog_product_id: index + 1,
      material_id: null,
      description: `Prueba ${rule.category}`,
      quantity: '1',
      returned_quantity: '0',
      unit_price_usd: '1.0000',
      subtotal_usd: '1.0000',
      catalog_product: {
        id: index + 1,
        name: `Producto demo (${rule.category})`,
        category: rule.category.trim(),
        sale_unit: 'UND' as const,
      },
    }))

  if (lines.length === 0) {
    return base
  }

  return {
    ...base,
    lines,
  }
}

export function formatPrintErrors(errors: PrintDocumentError[]): string {
  return errors.map((error) => error.message).join('\n')
}
