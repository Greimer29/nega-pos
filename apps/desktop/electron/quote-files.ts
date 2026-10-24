import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const QUOTES_FOLDER = 'Presupuestos'
const MAX_PDF_BYTES = 20 * 1024 * 1024

/** Keeps only a safe base name ending in `.pdf` (no folders, no reserved characters). */
export function safeQuoteFileName(fileName: string): string {
  const base = path.basename(String(fileName ?? '')).replace(/[^A-Za-z0-9._ -]/g, '_').trim()
  const withoutExt = base.replace(/\.pdf$/i, '').replace(/^\.+/, '') || 'Presupuesto'
  return `${withoutExt.slice(0, 80)}.pdf`
}

/** Saves the quote in Downloads/Presupuestos and shows it selected in the file explorer. */
export async function saveQuotePdf(
  fileName: string,
  data: Uint8Array
): Promise<{ path: string; fileName: string }> {
  if (!(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength > MAX_PDF_BYTES) {
    throw new Error('El PDF del presupuesto no es válido.')
  }
  if (Buffer.from(data.subarray(0, 5)).toString('latin1') !== '%PDF-') {
    throw new Error('El archivo recibido no es un PDF.')
  }

  const folder = path.join(app.getPath('downloads'), QUOTES_FOLDER)
  await fs.promises.mkdir(folder, { recursive: true })

  const safeName = safeQuoteFileName(fileName)
  const target = path.join(folder, safeName)
  await fs.promises.writeFile(target, data)
  shell.showItemInFolder(target)

  return { path: target, fileName: safeName }
}
