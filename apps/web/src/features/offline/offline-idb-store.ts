const DB_NAME = 'nega-pos-offline'
const DB_VERSION = 1
const CATALOG_KEY = 'catalogo'
const OPS_STORE = 'operations'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
      if (!db.objectStoreNames.contains(OPS_STORE)) {
        db.createObjectStore(OPS_STORE, { keyPath: 'fileName' })
      }
    }
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Error IndexedDB'))
    tx.onabort = () => reject(tx.error ?? new Error('Transacción IndexedDB abortada'))
  })
}

export async function idbWriteCatalog(json: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction('meta', 'readwrite')
  tx.objectStore('meta').put(json, CATALOG_KEY)
  await txDone(tx)
  db.close()
}

export async function idbReadCatalog(): Promise<string | null> {
  const db = await openDb()
  const tx = db.transaction('meta', 'readonly')
  const request = tx.objectStore('meta').get(CATALOG_KEY)
  const value = await new Promise<string | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('Lectura catálogo falló'))
  })
  await txDone(tx)
  db.close()
  return value
}

export async function idbListOperations(): Promise<string[]> {
  const db = await openDb()
  const tx = db.transaction(OPS_STORE, 'readonly')
  const request = tx.objectStore(OPS_STORE).getAllKeys()
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Listado operaciones falló'))
  })
  await txDone(tx)
  db.close()
  return keys.map(String).sort()
}

export async function idbWriteOperation(fileName: string, json: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(OPS_STORE, 'readwrite')
  tx.objectStore(OPS_STORE).put({ fileName, json })
  await txDone(tx)
  db.close()
}

export async function idbReadOperation(fileName: string): Promise<string | null> {
  const db = await openDb()
  const tx = db.transaction(OPS_STORE, 'readonly')
  const request = tx.objectStore(OPS_STORE).get(fileName)
  const row = await new Promise<{ fileName: string; json: string } | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as { fileName: string; json: string } | undefined)
    request.onerror = () => reject(request.error ?? new Error('Lectura operación falló'))
  })
  await txDone(tx)
  db.close()
  return row?.json ?? null
}

export async function idbDeleteOperation(fileName: string): Promise<boolean> {
  const db = await openDb()
  const tx = db.transaction(OPS_STORE, 'readwrite')
  const store = tx.objectStore(OPS_STORE)
  const existing = await new Promise<unknown>((resolve, reject) => {
    const req = store.get(fileName)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Lookup operación falló'))
  })
  if (!existing) {
    await txDone(tx)
    db.close()
    return false
  }
  store.delete(fileName)
  await txDone(tx)
  db.close()
  return true
}

export async function idbHasPending(): Promise<boolean> {
  const files = await idbListOperations()
  return files.length > 0
}
