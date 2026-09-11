import { useRef, useState } from 'react'
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getImportColumns, importKindLabel } from '@/features/catalog-import/columns'
import { downloadImportTemplate } from '@/features/catalog-import/export-import-template'
import {
  ImportFileError,
  parseImportFile,
} from '@/features/catalog-import/parse-import-file'
import type {
  CatalogImportKind,
  CatalogImportResult,
  CatalogProductImportRow,
  MaterialImportRow,
} from '@/features/catalog-import/types'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { toolbarActionsClass } from '@/components/layout/responsive-toolbar'
import { cn } from '@/lib/utils'

type CatalogImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: CatalogImportKind
  isPending: boolean
  onImport: (
    rows: Array<CatalogProductImportRow | MaterialImportRow>
  ) => Promise<CatalogImportResult>
}

export function CatalogImportDialog({
  open,
  onOpenChange,
  kind,
  isPending,
  onImport,
}: CatalogImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [rows, setRows] = useState<Array<CatalogProductImportRow | MaterialImportRow>>([])
  const [result, setResult] = useState<CatalogImportResult | null>(null)
  const columns = getImportColumns(kind)
  const entity = importKindLabel(kind)

  function resetState() {
    setFileName(null)
    setParseError(null)
    setRows([])
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  async function handleFileChange(file: File | undefined) {
    setResult(null)
    setParseError(null)
    setRows([])
    setFileName(file?.name ?? null)
    if (!file) return

    try {
      const parsed = await parseImportFile(file, kind)
      setRows(parsed.rows)
    } catch (error) {
      const message =
        error instanceof ImportFileError
          ? error.message
          : 'No se pudo leer el archivo. Usá la plantilla de Nega POS o un CSV UTF-8.'
      setParseError(message)
    }
  }

  async function handleImport() {
    if (rows.length === 0) return
    try {
      const imported = await onImport(rows)
      setResult(imported)
      if (imported.created > 0 && imported.failed === 0) {
        toast.success(
          `Se importaron ${imported.created} ${entity}.`,
          'Importación completa'
        )
      } else if (imported.created > 0) {
        toast.warning(
          `Se importaron ${imported.created} ${entity}. ${imported.failed} fila${imported.failed === 1 ? '' : 's'} no se pudieron crear.`,
          'Importación parcial'
        )
      } else {
        toast.error('Ninguna fila se pudo importar. Revisá los errores.', 'Importación fallida')
      }
    } catch (error) {
      notifyApiError(error)
    }
  }

  const failedRows = result?.results.filter((item) => !item.ok) ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar {entity} desde Excel</DialogTitle>
          <DialogDescription>
            Descargá la plantilla, completala y subila. Los campos con * son obligatorios. Máximo
            200 filas por archivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border px-3 py-2">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Columnas de la plantilla
            </p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((column) => (
                <span
                  key={column.key}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    column.required
                      ? 'bg-red-50 text-red-800'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {column.header}
                </span>
              ))}
            </div>
          </div>

          <div className={toolbarActionsClass}>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadImportTemplate(kind)}
              disabled={isPending}
            >
              <FileSpreadsheet className="size-4" />
              Descargar plantilla
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="size-4" />
              Elegir archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xls,.xlsx,.csv,.xml,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0])
              }}
            />
          </div>

          {fileName ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Archivo: </span>
              {fileName}
              {rows.length > 0 ? (
                <span className="text-muted-foreground">
                  {' '}
                  · {rows.length} fila{rows.length === 1 ? '' : 's'} lista
                  {rows.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </p>
          ) : null}

          {parseError ? <p className="text-destructive text-sm">{parseError}</p> : null}

          {result ? (
            <div className="space-y-2 rounded-md border px-3 py-2 text-sm">
              <p>
                Creados: <strong>{result.created}</strong>
                {result.failed > 0 ? (
                  <>
                    {' '}
                    · Con error: <strong>{result.failed}</strong>
                  </>
                ) : null}
              </p>
              {failedRows.length > 0 ? (
                <ul className="text-destructive max-h-40 overflow-auto text-xs">
                  {failedRows.map((item) => (
                    <li key={`${item.row}-${item.error}`}>{item.error ?? `Fila ${item.row}`}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleImport()
            }}
            disabled={isPending || rows.length === 0 || Boolean(parseError)}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Importar {rows.length > 0 ? `(${rows.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
