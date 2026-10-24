import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { getElectronFilesApi } from '@/lib/electron-bridge'

export type QuoteDeliveryTarget = 'android' | 'desktop' | 'browser'

export type QuoteDeliveryResult =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'saved'; path: string }
  | { kind: 'downloaded' }

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** Android shares through the native sheet, the desktop app saves to Downloads, browsers download. */
export function quoteDeliveryTarget(): QuoteDeliveryTarget {
  if (isNativeApp()) return 'android'
  if (getElectronFilesApi()) return 'desktop'
  return 'browser'
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

/** The share sheet rejects when the user closes it without choosing an app. */
export function isShareCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /cancel/i.test(message)
}

async function shareOnAndroid(blob: Blob, fileName: string): Promise<QuoteDeliveryResult> {
  const written = await Filesystem.writeFile({
    path: fileName,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  })

  try {
    await Share.share({
      title: fileName.replace(/\.pdf$/i, ''),
      files: [written.uri],
      dialogTitle: 'Enviar presupuesto',
    })
    return { kind: 'shared' }
  } catch (error) {
    if (isShareCancelled(error)) return { kind: 'cancelled' }
    throw error
  }
}

function downloadInBrowser(blob: Blob, fileName: string): QuoteDeliveryResult {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return { kind: 'downloaded' }
}

export async function deliverQuotePdf(blob: Blob, fileName: string): Promise<QuoteDeliveryResult> {
  const target = quoteDeliveryTarget()

  if (target === 'android') {
    return shareOnAndroid(blob, fileName)
  }

  const files = getElectronFilesApi()
  if (target === 'desktop' && files) {
    const saved = await files.saveQuotePdf(fileName, new Uint8Array(await blob.arrayBuffer()))
    return { kind: 'saved', path: saved.path }
  }

  return downloadInBrowser(blob, fileName)
}
