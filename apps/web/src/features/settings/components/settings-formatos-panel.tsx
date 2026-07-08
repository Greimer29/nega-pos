import { Copy, Eye, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentPreview } from '@/features/printing/components/document-preview'
import { FormatFormDialog } from '@/features/printing/components/format-form-dialog'
import { createSampleSale } from '@/features/printing/render-document'
import {
  PRINT_DOCUMENT_LABELS,
  type PrintDocumentKind,
  type PrintConfig,
  type PrintFormatRecord,
} from '@/features/printing/types'
import { BUILTIN_FORMAT_IDS } from '@/features/printing/utils/print-format-defaults'
import {
  createBlankFormat,
  duplicateFormat,
  formatsForDocumentKind,
  removeFormat,
  upsertFormat,
} from '@/features/printing/utils/print-formats'
import { usePrintSettingsPanel } from '@/features/settings/hooks/use-print-settings-panel'
const sampleSale = createSampleSale()

export function SettingsFormatosPanel() {
  const {
    canEdit,
    config,
    setConfig,
    loading,
    saving,
    message,
    error,
    handleSave,
  } = usePrintSettingsPanel()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<PrintFormatRecord | null>(null)
  const [previewFormatId, setPreviewFormatId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function openCreate(documentKind: PrintDocumentKind) {
    setSelectedFormat(createBlankFormat(documentKind))
    setDialogOpen(true)
  }

  function openEdit(format: PrintFormatRecord) {
    setSelectedFormat(format)
    setDialogOpen(true)
  }

  function applyFormatUpdate(nextFormat: PrintFormatRecord) {
    setConfig((current) => ({
      ...current,
      formats: upsertFormat(current.formats, nextFormat),
    }))
  }

  function handleDuplicate(format: PrintFormatRecord) {
    setConfig((current) => ({
      ...current,
      formats: [...current.formats, duplicateFormat(format, current.formats)],
    }))
  }

  function handleDelete(format: PrintFormatRecord) {
    if (format.isBuiltin) return
    if (!window.confirm(`¿Eliminar el formato "${format.name}"?`)) return

    setActionError(null)
    setConfig((current) => {
      const { formats, removed } = removeFormat(current.formats, format.id)
      if (!removed) {
        return current
      }

      const nextDocuments = { ...current.documents }
      for (const kind of ['invoice', 'deliveryNote', 'comanda'] as const) {
        if (nextDocuments[kind].formatId === format.id) {
          nextDocuments[kind] = {
            ...nextDocuments[kind],
            formatId: BUILTIN_FORMAT_IDS[kind],
          }
        }
      }

      if (previewFormatId === format.id) {
        setPreviewFormatId(null)
      }

      return {
        ...current,
        formats,
        documents: nextDocuments,
      }
    })
  }

  function setActiveFormat(kind: PrintDocumentKind, formatId: string) {
    setConfig((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [kind]: {
          ...current.documents[kind],
          formatId,
        },
      },
    }))
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16">
        <Loader2 className="size-5 animate-spin" />
        Cargando formatos…
      </div>
    )
  }

  const previewFormat =
    config.formats.find((format) => format.id === previewFormatId) ?? config.formats[0] ?? null

  const previewConfig: Pick<PrintConfig, 'business' | 'formats' | 'documents'> = previewFormat
    ? {
        business: config.business,
        formats: config.formats,
        documents: {
          invoice: {
            ...config.documents.invoice,
            formatId:
              previewFormat.documentKind === 'invoice'
                ? previewFormat.id
                : config.documents.invoice.formatId,
            paperWidthMm: previewFormat.paperWidthMm,
          },
          deliveryNote: {
            ...config.documents.deliveryNote,
            formatId:
              previewFormat.documentKind === 'deliveryNote'
                ? previewFormat.id
                : config.documents.deliveryNote.formatId,
            paperWidthMm: previewFormat.paperWidthMm,
          },
          comanda: {
            ...config.documents.comanda,
            formatId:
              previewFormat.documentKind === 'comanda'
                ? previewFormat.id
                : config.documents.comanda.formatId,
            paperWidthMm: previewFormat.paperWidthMm,
          },
        },
      }
    : config

  return (
    <div className="flex flex-col gap-6">
      {message ? <p className="text-emerald-700 text-sm">{message}</p> : null}
      {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}
      {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formato activo por documento</CardTitle>
          <CardDescription>
            Elegí qué plantilla se usa al imprimir cada tipo de ticket en caja.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(['invoice', 'deliveryNote', 'comanda'] as const).map((kind) => (
            <div key={kind} className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`active-format-${kind}`}>
                {PRINT_DOCUMENT_LABELS[kind]}
              </label>
              <select
                id={`active-format-${kind}`}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={config.documents[kind].formatId}
                disabled={!canEdit}
                onChange={(event) => setActiveFormat(kind, event.target.value)}
              >
                {formatsForDocumentKind(config.formats, kind).map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Formatos guardados</CardTitle>
            <CardDescription>
              Creá, editá, duplicá o eliminá plantillas de ticket 78 mm.
            </CardDescription>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openCreate('invoice')}>
                <Plus className="size-4" />
                Factura
              </Button>
              <Button size="sm" variant="outline" onClick={() => openCreate('deliveryNote')}>
                <Plus className="size-4" />
                Nota
              </Button>
              <Button size="sm" variant="outline" onClick={() => openCreate('comanda')}>
                <Plus className="size-4" />
                Comanda
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Ancho</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {config.formats.map((format) => {
                  const isActive =
                    config.documents[format.documentKind].formatId === format.id
                  return (
                    <tr key={format.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span>{format.name}</span>
                          {isActive ? (
                            <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">
                              Activo
                            </span>
                          ) : null}
                          {format.isBuiltin ? (
                            <span className="text-muted-foreground text-xs">Sistema</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {PRINT_DOCUMENT_LABELS[format.documentKind]}
                      </td>
                      <td className="px-3 py-2 align-middle">{format.paperWidthMm} mm</td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewFormatId(format.id)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canEdit ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => openEdit(format)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDuplicate(format)}
                              >
                                <Copy className="size-4" />
                              </Button>
                              {!format.isBuiltin ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(format)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {previewFormat ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa — {previewFormat.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentPreview
              kind={previewFormat.documentKind}
              sale={sampleSale}
              config={previewConfig}
            />
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <Button type="button" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar formatos
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          Solo lectura — no tenés permiso para editar (`settings.edit`).
        </p>
      )}

      <FormatFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        format={selectedFormat}
        config={config}
        canEdit={canEdit}
        onSave={applyFormatUpdate}
      />
    </div>
  )
}
