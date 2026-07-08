import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentPreview } from '@/features/printing/components/document-preview'
import { createSampleSale } from '@/features/printing/render-document'
import type { PrintConfig, PrintDocumentKind, PrintFormatRecord } from '@/features/printing/types'
import { FORMAT_PLACEHOLDER_HELP, DEFAULT_TICKET_PAPER_WIDTH_MM } from '@/features/printing/utils/print-format-defaults'

type FormatFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  format: PrintFormatRecord | null
  config: Pick<PrintConfig, 'business' | 'formats' | 'documents'>
  canEdit: boolean
  onSave: (format: PrintFormatRecord) => void
}

const sampleSale = createSampleSale()

export function FormatFormDialog({
  open,
  onOpenChange,
  format,
  config,
  canEdit,
  onSave,
}: FormatFormDialogProps) {
  const isEditing = format != null
  const [name, setName] = useState('')
  const [documentKind, setDocumentKind] = useState<PrintDocumentKind>('invoice')
  const [paperWidthMm, setPaperWidthMm] = useState(String(DEFAULT_TICKET_PAPER_WIDTH_MM))
  const [bodyHtml, setBodyHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !format) return
    setError(null)
    setName(format.name)
    setDocumentKind(format.documentKind)
    setPaperWidthMm(String(format.paperWidthMm))
    setBodyHtml(format.bodyHtml)
  }, [open, format])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!format || !canEdit) return

    setError(null)
    const trimmedName = name.trim()
    const parsedWidth = Number(paperWidthMm)
    const trimmedBody = bodyHtml.trim()

    if (!trimmedName) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
      setError('El ancho del papel debe ser mayor a 0.')
      return
    }
    if (!trimmedBody) {
      setError('El contenido del formato no puede estar vacío.')
      return
    }

    onSave({
      ...format,
      name: trimmedName,
      documentKind: format.isBuiltin ? format.documentKind : documentKind,
      paperWidthMm: parsedWidth,
      bodyHtml: trimmedBody,
    })
    onOpenChange(false)
  }

  const draftFormat = format
    ? {
        ...format,
        name: name.trim() || format.name,
        documentKind: format.isBuiltin ? format.documentKind : documentKind,
        paperWidthMm: Number(paperWidthMm) || format.paperWidthMm,
        bodyHtml: bodyHtml || format.bodyHtml,
      }
    : null

  const previewFormats = draftFormat
    ? [...config.formats.filter((item) => item.id !== draftFormat.id), draftFormat]
    : config.formats

  const previewConfig = draftFormat
    ? {
        ...config,
        formats: previewFormats,
        documents: {
          invoice: {
            ...config.documents.invoice,
            formatId: draftFormat.documentKind === 'invoice' ? draftFormat.id : config.documents.invoice.formatId,
            paperWidthMm: draftFormat.documentKind === 'invoice' ? draftFormat.paperWidthMm : config.documents.invoice.paperWidthMm,
          },
          deliveryNote: {
            ...config.documents.deliveryNote,
            formatId:
              draftFormat.documentKind === 'deliveryNote'
                ? draftFormat.id
                : config.documents.deliveryNote.formatId,
            paperWidthMm:
              draftFormat.documentKind === 'deliveryNote'
                ? draftFormat.paperWidthMm
                : config.documents.deliveryNote.paperWidthMm,
          },
          comanda: {
            ...config.documents.comanda,
            formatId:
              draftFormat.documentKind === 'comanda' ? draftFormat.id : config.documents.comanda.formatId,
            paperWidthMm:
              draftFormat.documentKind === 'comanda'
                ? draftFormat.paperWidthMm
                : config.documents.comanda.paperWidthMm,
          },
        },
      }
    : config

  const previewKind = draftFormat?.documentKind ?? 'invoice'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar formato' : 'Nuevo formato'}</DialogTitle>
            <DialogDescription>
              Editá el HTML del ticket usando placeholders. Los cambios se guardan al confirmar en
              la pestaña Formatos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 lg:grid-cols-2">
            <div className="space-y-4">
              {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

              <div className="space-y-2">
                <Label htmlFor="format-name">Nombre</Label>
                <Input
                  id="format-name"
                  value={name}
                  disabled={!canEdit}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format-kind">Tipo de documento</Label>
                <select
                  id="format-kind"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={documentKind}
                  disabled={!canEdit || format?.isBuiltin}
                  onChange={(event) => setDocumentKind(event.target.value as PrintDocumentKind)}
                >
                  <option value="invoice">Factura / Recibo</option>
                  <option value="deliveryNote">Nota de despacho</option>
                  <option value="comanda">Comanda</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format-width">Ancho del papel (mm)</Label>
                <Input
                  id="format-width"
                  type="number"
                  min={1}
                  value={paperWidthMm}
                  disabled={!canEdit}
                  onChange={(event) => setPaperWidthMm(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format-body">Contenido HTML</Label>
                <textarea
                  id="format-body"
                  className="border-input bg-background min-h-56 w-full rounded-md border px-3 py-2 font-mono text-xs"
                  value={bodyHtml}
                  disabled={!canEdit}
                  onChange={(event) => setBodyHtml(event.target.value)}
                />
              </div>

              <div className="rounded-md border bg-muted/30 p-3">
                <p className="mb-2 text-sm font-medium">Placeholders disponibles</p>
                <pre className="text-muted-foreground whitespace-pre-wrap text-xs">
                  {FORMAT_PLACEHOLDER_HELP}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vista previa</Label>
              {draftFormat ? (
                <DocumentPreview kind={previewKind} sale={sampleSale} config={previewConfig} />
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {canEdit ? (
              <Button type="submit">Aplicar cambios</Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
