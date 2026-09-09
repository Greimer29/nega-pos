import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import http, {
  createServer,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type ServerResponse,
  type Server,
} from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import serveHandler from 'serve-handler'
import type { PrintConfig } from './print-config'
import {
  getPrintConfigPath,
  isPrintConfigMigrated,
  listPrinters,
  markPrintConfigMigrated,
  printHtml,
  readLocalPrintConfigForMigration,
  readPrintConfig,
  writePrintConfig,
  type PrintHtmlOptions,
} from './print-service'

const APP_NAME = 'Nega POS'
const PORT = 51740
const HOST = '127.0.0.1'
const APP_URL = `http://${HOST}:${PORT}`

app.setName(APP_NAME)
if (process.platform === 'win32') {
  app.setAppUserModelId('com.negapos.app')
}

let server: Server | null = null
let mainWindow: BrowserWindow | null = null
let runtimeApiUrl = ''

function getWebDistPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web-dist')
  }
  return path.join(app.getAppPath(), '..', 'web', 'dist')
}

function getConfigCandidates(fileName: string): string[] {
  return app.isPackaged
    ? [
        path.join(path.dirname(process.execPath), fileName),
        path.join(process.resourcesPath, fileName),
      ]
    : [path.join(app.getAppPath(), fileName)]
}

function readJsonConfig<T>(fileName: string): T | null {
  for (const candidate of getConfigCandidates(fileName)) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf8')) as T
    } catch {
      // Ignorar archivo inválido y continuar.
    }
  }

  return null
}

function resolveApiUrl(): string {
  const fromEnv = process.env.APP_API_URL?.trim() || process.env.NEGA_POS_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const fromApiFile = readJsonConfig<{ apiUrl?: string }>('api-url.json')
  if (fromApiFile?.apiUrl?.trim()) {
    return fromApiFile.apiUrl.trim().replace(/\/$/, '')
  }

  return ''
}

/** Best-effort: open TLS + wake Railway before the UI's first authenticated calls. */
function warmupApiConnection(apiUrl: string): void {
  if (!apiUrl) {
    return
  }

  try {
    const target = new URL('/health', `${apiUrl.replace(/\/$/, '')}/`)
    const transport = target.protocol === 'https:' ? https : http
    const req = transport.get(target, (res) => {
      res.resume()
    })
    req.setTimeout(15_000, () => {
      req.destroy()
    })
    req.on('error', () => {
      // Warm-up must never block app start.
    })
  } catch {
    // Invalid URL or transport error — ignore.
  }
}

function rewriteProxyCookies(raw: string | string[] | undefined): string[] | undefined {
  if (!raw) {
    return undefined
  }

  const cookies = Array.isArray(raw) ? raw : [raw]
  return cookies.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, '')
      .replace(/;\s*Secure/gi, '')
      .replace(/;\s*SameSite=[^;]*/gi, '; SameSite=Lax')
  )
}

function proxyApiRequest(req: IncomingMessage, res: ServerResponse): void {
  const requestPath = req.url ?? '/'
  const target = new URL(requestPath, `${runtimeApiUrl.replace(/\/$/, '')}/`)
  const isHttps = target.protocol === 'https:'
  const transport = isHttps ? https : http
  const defaultPort = isHttps ? 443 : 80

  const proxyReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || defaultPort,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      const headers: OutgoingHttpHeaders = { ...proxyRes.headers }
      const rewrittenCookies = rewriteProxyCookies(headers['set-cookie'])
      if (rewrittenCookies) {
        headers['set-cookie'] = rewrittenCookies
      } else {
        delete headers['set-cookie']
      }

      for (const [key, value] of Object.entries(headers)) {
        if (value === undefined) {
          delete headers[key as keyof OutgoingHttpHeaders]
        }
      }

      res.writeHead(proxyRes.statusCode ?? 502, headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: {
            code: 'API_UNREACHABLE',
            message: 'No se pudo conectar con la API.',
          },
        })
      )
    }
  })

  req.pipe(proxyReq)
}

function startStaticServer(): Promise<void> {
  const webDist = getWebDistPath()
  runtimeApiUrl = resolveApiUrl()

  if (!runtimeApiUrl) {
    throw new Error(
      'No hay apiUrl configurada. Definí NEGA_POS_API_URL o colocá api-url.json junto al ejecutable.'
    )
  }

  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/runtime-config.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ apiUrl: runtimeApiUrl, useLocalApiProxy: true }))
      return
    }

    if (req.url?.startsWith('/api/')) {
      proxyApiRequest(req, res)
      return
    }

    return serveHandler(req, res, {
      public: webDist,
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  })

  return new Promise((resolve, reject) => {
    server!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve()
        return
      }
      reject(err)
    })

    server!.listen(PORT, HOST, () => resolve())
  })
}

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

function registerPrintingHandlers(): void {
  ipcMain.handle('printing:listPrinters', async (event) => listPrinters(event.sender))

  /** @deprecated Prefer API; kept for migration / legacy callers. */
  ipcMain.handle('printing:getConfig', async () => readPrintConfig())

  ipcMain.handle('printing:getLocalConfig', async () => readLocalPrintConfigForMigration())

  ipcMain.handle('printing:getConfigPath', async () => getPrintConfigPath())

  ipcMain.handle('printing:isMigrated', async () => isPrintConfigMigrated())

  ipcMain.handle('printing:markMigrated', async () => {
    markPrintConfigMigrated()
  })

  /** @deprecated Config is owned by the API; local write only for emergency/legacy. */
  ipcMain.handle('printing:saveConfig', async (_event, config: PrintConfig) =>
    writePrintConfig(config)
  )

  ipcMain.handle('printing:printHtml', async (_event, options: PrintHtmlOptions) => {
    await printHtml(options)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1670,
    height: 940,
    minWidth: 1670,
    minHeight: 940,
    center: true,
    title: APP_NAME,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  })

  void mainWindow.loadURL(APP_URL)
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  void app.whenReady().then(async () => {
    try {
      registerPrintingHandlers()
      await startStaticServer()
      warmupApiConnection(runtimeApiUrl)
      createWindow()
    } catch (err) {
      dialog.showErrorBox(
        APP_NAME,
        err instanceof Error ? err.message : 'No se pudo iniciar la aplicación.'
      )
      app.quit()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  server?.close()
})
