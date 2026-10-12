import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const OFFLINE_DIR = 'offline'
const CATALOG_FILE = 'catalogo.json'

function getOfflineDir(): string {
  const dir = path.join(app.getPath('userData'), OFFLINE_DIR)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeAtomic(filePath: string, contents: string): void {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tempPath, contents, 'utf8')
  fs.renameSync(tempPath, filePath)
}

export function getOfflineRootPath(): string {
  return getOfflineDir()
}

export function writeOfflineCatalog(json: string): void {
  writeAtomic(path.join(getOfflineDir(), CATALOG_FILE), json)
}

export function readOfflineCatalog(): string | null {
  const filePath = path.join(getOfflineDir(), CATALOG_FILE)
  if (!fs.existsSync(filePath)) {
    return null
  }
  return fs.readFileSync(filePath, 'utf8')
}

export function listOfflineOperationFiles(): string[] {
  const dir = getOfflineDir()
  return fs
    .readdirSync(dir)
    .filter((name) => name !== CATALOG_FILE && name.endsWith('.json'))
    .sort()
}

export function writeOfflineOperation(fileName: string, json: string): void {
  const safeName = path.basename(fileName)
  if (!safeName.endsWith('.json') || safeName === CATALOG_FILE) {
    throw new Error('Nombre de archivo offline inválido')
  }
  writeAtomic(path.join(getOfflineDir(), safeName), json)
}

export function readOfflineOperation(fileName: string): string | null {
  const safeName = path.basename(fileName)
  const filePath = path.join(getOfflineDir(), safeName)
  if (!fs.existsSync(filePath)) {
    return null
  }
  return fs.readFileSync(filePath, 'utf8')
}

export function deleteOfflineOperation(fileName: string): boolean {
  const safeName = path.basename(fileName)
  const filePath = path.join(getOfflineDir(), safeName)
  if (!fs.existsSync(filePath)) {
    return false
  }
  fs.unlinkSync(filePath)
  return true
}

export function hasPendingOfflineOperations(): boolean {
  return listOfflineOperationFiles().length > 0
}
