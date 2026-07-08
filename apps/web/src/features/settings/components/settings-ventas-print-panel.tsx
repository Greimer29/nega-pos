import { Loader2, Printer, RefreshCw, Save } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ComandaRoutingCard } from '@/features/printing/components/comanda-routing-card'
import { PaymentMethodsConfigCard } from '@/features/payment-methods/components/payment-methods-config-card'
import { PrinterSelect } from '@/features/printing/components/printer-select'
import { PRINT_DOCUMENT_LABELS } from '@/features/printing/types'
import { usePrintSettingsPanel } from '@/features/settings/hooks/use-print-settings-panel'

export function SettingsVentasPrintPanel() {
  const {
    canEdit,
    config,
    setConfig,
    printers,
    loading,
    saving,
    testingKind,
    message,
    error,
    electronAvailable,
    refreshingPrinters,
    updateDocument,
    handleRefreshPrinters,
    handleSave,
    handleTestPrint,
  } = usePrintSettingsPanel()

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16">
        <Loader2 className="size-5 animate-spin" />
        Cargando configuración de ventas…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PaymentMethodsConfigCard />

      {!electronAvailable ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La impresión térmica está disponible en la app de escritorio (Electron). Si abriste
          localhost:5173 en Chrome o Edge, cerralo y usá la ventana <strong>Nega POS</strong>.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {printers.length > 0
              ? `${printers.length} impresora(s) detectada(s) en Windows.`
              : 'Aún no se detectaron impresoras.'}{' '}
            La lista se actualiza al volver a esta ventana; también podés usar el botón de abajo.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshingPrinters}
            onClick={() => void handleRefreshPrinters()}
          >
            {refreshingPrinters ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Actualizar lista
          </Button>
        </div>
      )}

      {message ? <p className="text-emerald-700 text-sm">{message}</p> : null}
      {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del negocio en tickets</CardTitle>
          <CardDescription>
            Nombre, datos fiscales y logo se configuran en la pestaña{' '}
            <Link to="/settings?tab=general" className="text-primary font-medium underline">
              General
            </Link>
            . Aquí solo definís impresoras y formatos por documento.
          </CardDescription>
        </CardHeader>
      </Card>

      {(['invoice', 'deliveryNote', 'comanda'] as const).map((kind) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Printer className="size-4" />
              {PRINT_DOCUMENT_LABELS[kind]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={config.documents[kind].enabled}
                disabled={!canEdit}
                onChange={(event) => updateDocument(kind, { enabled: event.target.checked })}
              />
              Habilitar impresión de {PRINT_DOCUMENT_LABELS[kind].toLowerCase()}
            </label>

            <div className="space-y-2">
              <Label htmlFor={`printer-${kind}`}>Impresora</Label>
              <PrinterSelect
                id={`printer-${kind}`}
                printers={printers}
                value={config.documents[kind].deviceName}
                disabled={!canEdit || !electronAvailable}
                onChange={(deviceName) => updateDocument(kind, { deviceName })}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={!electronAvailable || testingKind === kind}
              onClick={() => void handleTestPrint(kind)}
            >
              {testingKind === kind ? <Loader2 className="size-4 animate-spin" /> : null}
              Probar impresión
            </Button>
            {kind === 'comanda' && config.categoryRouting.comanda.enabled ? (
              <p className="text-muted-foreground text-xs">
                Con enrutamiento activo, la prueba envía un ticket de ejemplo a cada impresora
                configurada en la tabla de abajo.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comportamiento al confirmar venta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={config.behavior.printInvoiceOnConfirm}
              disabled={!canEdit}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  behavior: {
                    ...current.behavior,
                    printInvoiceOnConfirm: event.target.checked,
                  },
                }))
              }
            />
            Imprimir factura al confirmar venta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={config.behavior.printDeliveryNoteOnConfirm}
              disabled={!canEdit}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  behavior: {
                    ...current.behavior,
                    printDeliveryNoteOnConfirm: event.target.checked,
                  },
                }))
              }
            />
            Imprimir nota de despacho al confirmar venta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={config.behavior.printComandaOnConfirm}
              disabled={!canEdit}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  behavior: {
                    ...current.behavior,
                    printComandaOnConfirm: event.target.checked,
                  },
                }))
              }
            />
            Imprimir comanda al confirmar venta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={config.behavior.printComandaFormula ?? false}
              disabled={!canEdit}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  behavior: {
                    ...current.behavior,
                    printComandaFormula: event.target.checked,
                  },
                }))
              }
            />
            Imprimir fórmula en comanda
          </label>
          <p className="text-muted-foreground text-xs">
            La nota de despacho es el documento completo para el cliente. La comanda va a cocina o
            barra con solo producto, cantidad y medida (según configuración de abajo). Si activás
            "Imprimir fórmula en comanda", se imprimen los materiales debajo de cada producto.
          </p>
        </CardContent>
      </Card>

      <ComandaRoutingCard
        config={config}
        printers={printers}
        canEdit={canEdit}
        electronAvailable={electronAvailable}
        onChange={setConfig}
      />

      {canEdit ? (
        <Button type="button" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar configuración
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          Solo lectura — no tenés permiso para editar (`settings.edit`).
        </p>
      )}
    </div>
  )
}
