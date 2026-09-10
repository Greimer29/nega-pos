import { app, net, shell, type Session, type WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { createWriteStream } from 'node:fs'

export type UpdateDownloadProgress = {
  receivedBytes: number
  totalBytes: number | null
  percent: number | null
}

function assertSafeUpdateUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('URL de actualización inválida.')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('La URL de actualización debe ser http(s).')
  }

  if (!/\/api\/v1\/app-updates\/download\/desktop\/?$/i.test(parsed.pathname)) {
    throw new Error('Solo se puede auto-actualizar desde /api/v1/app-updates/download/desktop.')
  }
}

function fileNameFromDisposition(header: string | string[] | undefined): string | null {
  const raw = Array.isArray(header) ? header[0] : header
  if (!raw) return null
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(raw)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1].replace(/["']/g, '').trim())
  } catch {
    return match[1].replace(/["']/g, '').trim()
  }
}

export async function downloadAndLaunchDesktopUpdater(
  webContents: WebContents,
  downloadUrl: string
): Promise<{ path: string; fileName: string }> {
  assertSafeUpdateUrl(downloadUrl)

  const session: Session = webContents.session
  const tempDir = path.join(app.getPath('temp'), 'nega-pos-updates')
  await fs.promises.mkdir(tempDir, { recursive: true })

  const provisionalName = `Nega-POS-Setup-update-${Date.now()}.exe`
  let destPath = path.join(tempDir, provisionalName)
  let finalName = provisionalName

  await new Promise<void>((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: downloadUrl,
      session,
      redirect: 'follow',
    })

    request.on('response', (response) => {
      const status = response.statusCode ?? 0
      if (status < 200 || status >= 300) {
        reject(new Error(`No se pudo descargar la actualización (HTTP ${status}).`))
        return
      }

      const fromHeader = fileNameFromDisposition(response.headers['content-disposition'])
      if (fromHeader && fromHeader.toLowerCase().endsWith('.exe')) {
        finalName = path.basename(fromHeader)
        destPath = path.join(tempDir, finalName)
      }

      const totalHeader = response.headers['content-length']
      const totalRaw = Array.isArray(totalHeader) ? totalHeader[0] : totalHeader
      const totalBytes = totalRaw ? Number(totalRaw) : null
      let receivedBytes = 0

      const file = createWriteStream(destPath)
      // Electron's ClientRequest IncomingMessage typing omits pause/resume; write without backpressure.
      response.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length
        const percent =
          totalBytes && totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : null
        webContents.send('updates:progress', {
          receivedBytes,
          totalBytes,
          percent,
        } satisfies UpdateDownloadProgress)
        file.write(chunk)
      })
      response.on('end', () => {
        file.end(() => resolve())
      })
      response.on('error', (err) => {
        file.destroy()
        reject(err)
      })
      file.on('error', (err) => {
        reject(err)
      })
    })

    request.on('error', (err) => reject(err))
    request.end()
  })

  const openError = await shell.openPath(destPath)
  if (openError) {
    throw new Error(openError || 'No se pudo abrir el instalador.')
  }

  // NSIS necesita que la app suelte los archivos empaquetados.
  setTimeout(() => {
    app.quit()
  }, 1800)

  return { path: destPath, fileName: finalName }
}
