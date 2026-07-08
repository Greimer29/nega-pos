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

function getConfigWritePath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), PRINT_CONFIG_FILE)
  }
  return path.join(app.getAppPath(), PRINT_CONFIG_FILE)
}

function getConfigReadCandidates(): string[] {
  if (app.isPackaged) {
    return [
      path.join(path.dirname(process.execPath), PRINT_CONFIG_FILE),
      path.join(process.resourcesPath, PRINT_CONFIG_FILE),
    ]
  }
  return [path.join(app.getAppPath(), PRINT_CONFIG_FILE)]
}

export function readPrintConfig(): PrintConfig {
  for (const candidate of getConfigReadCandidates()) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    try {
      const raw = JSON.parse(fs.readFileSync(candidate, 'utf8')) as Partial<PrintConfig>
      return normalizePrintConfig(raw)
    } catch {
      // Continuar con el siguiente candidato.
    }
  }

  return structuredClone(DEFAULT_PRINT_CONFIG)
}

export function writePrintConfig(config: PrintConfig): PrintConfig {
  const normalized = normalizePrintConfig(config)
  const target = getConfigWritePath()
  fs.writeFileSync(target, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
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
  const { html, deviceName, paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM, jobName = 'Nega POS' } = options

  if (!deviceName.trim()) {
    throw new Error('No hay impresora configurada para este documento.')
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    await printWindow.loadURL(dataUrl)

    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.print(
        {
          silent: true,
          deviceName,
          printBackground: true,
          margins: { marginType: 'none' },
          pageSize: {
            width: paperWidthMm * 1000,
            height: 297000,
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
