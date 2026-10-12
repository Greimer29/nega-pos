import { app, BrowserWindow, type WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_PRINT_CONFIG,
  normalizePrintConfig,
  type PrintConfig,
} from './print-config'
import { DEFAULT_TICKET_PAPER_WIDTH_MM } from './print-format-defaults'

const PRINT_CONFIG_FILE = 'print-config.json'
const PRINT_CONFIG_MIGRATED_FLAG = 'print-config-migrated'
/** Resolución típica de impresoras térmicas 80 mm (203 DPI). */
const THERMAL_DPI = 203

function mmToMicrons(mm: number): number {
  return Math.round(mm * 1000)
}

function cssPxToMicrons(px: number): number {
  return Math.round((px * 25400) / 96)
}

function mmToThermalPx(mm: number): number {
  return Math.round((mm / 25.4) * THERMAL_DPI)
}

/** JSON legacy en userData. La configuración que se imprime vive en la API. */
export function getPrintConfigPath(): string {
  return path.join(app.getPath('userData'), PRINT_CONFIG_FILE)
}

function tryParseConfigFile(filePath: string): PrintConfig | null {
  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<PrintConfig>
    return normalizePrintConfig(raw)
  } catch {
    return null
  }
}

export function readPrintConfig(): PrintConfig {
  return tryParseConfigFile(getPrintConfigPath()) ?? structuredClone(DEFAULT_PRINT_CONFIG)
}

export function writePrintConfig(config: PrintConfig): PrintConfig {
  const normalized = normalizePrintConfig(config)
  const target = getPrintConfigPath()
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

function getPrintConfigMigratedFlagPath(): string {
  return path.join(app.getPath('userData'), PRINT_CONFIG_MIGRATED_FLAG)
}

/** True if this installation already imported local JSON into the API. */
export function isPrintConfigMigrated(): boolean {
  return fs.existsSync(getPrintConfigMigratedFlagPath())
}

export function markPrintConfigMigrated(): void {
  const flagPath = getPrintConfigMigratedFlagPath()
  fs.mkdirSync(path.dirname(flagPath), { recursive: true })
  fs.writeFileSync(flagPath, '1', 'utf8')
}

/**
 * JSON ya presente en userData, para una importación única a la API.
 * No copia el print-config.json del instalador: ese archivo es la plantilla
 * de fábrica y pisaría los formatos guardados en la base.
 */
export function readLocalPrintConfigForMigration(): PrintConfig | null {
  return tryParseConfigFile(getPrintConfigPath())
}

export type PrinterInfo = {
  name: string
  isDefault: boolean
  status?: number
}

export async function listPrinters(
  source: BrowserWindow | WebContents | null
): Promise<PrinterInfo[]> {
  const contents =
    source && 'webContents' in source
      ? source.webContents
      : (source ?? BrowserWindow.getAllWindows()[0]?.webContents)

  if (!contents || contents.isDestroyed()) {
    return []
  }

  const printers = await contents.getPrintersAsync()
  return printers.map((printer) => ({
    name: printer.name,
    isDefault: printer.isDefault,
    status: printer.status,
  }))
}

export type PrintHtmlOptions = {
  html: string
  deviceName: string
  paperWidthMm?: number
  jobName?: string
}

export async function printHtml(options: PrintHtmlOptions): Promise<void> {
  const { html, deviceName, paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM, jobName = 'Nega POS' } =
    options

  if (!deviceName.trim()) {
    throw new Error('No hay impresora configurada para este documento.')
  }

  const paperWidthPx = mmToThermalPx(paperWidthMm)

  const printWindow = new BrowserWindow({
    show: false,
    width: paperWidthPx,
    height: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    await printWindow.loadURL(dataUrl)

    await printWindow.webContents.executeJavaScript(`
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    `)

    const contentHeightPx = (await printWindow.webContents.executeJavaScript(
      `Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)`
    )) as number

    const pageWidthMicrons = mmToMicrons(paperWidthMm)
    const pageHeightMicrons = Math.max(cssPxToMicrons(contentHeightPx) + 2000, 50000)

    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.print(
        {
          silent: true,
          deviceName,
          printBackground: true,
          margins: { marginType: 'none' },
          scaleFactor: 100,
          dpi: { horizontal: THERMAL_DPI, vertical: THERMAL_DPI },
          pageSize: {
            width: pageWidthMicrons,
            height: pageHeightMicrons,
          },
        },
        (success, failureReason) => {
          if (success) {
            resolve()
            return
          }
          reject(new Error(failureReason || `No se pudo imprimir "${jobName}".`))
        }
      )
    })
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close()
    }
  }
}