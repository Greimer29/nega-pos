import { ArrowLeft, Loader2, Scale, Trash2 } from 'lucide-react'

import { useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { formatFecha } from '@/features/purchases/constants'

import { PrecioBimonetario } from '@/features/purchases/components/bi-currency-price'

import { AjusteStockDialog } from '@/features/materials/components/stock-adjustment-dialog'

import { MaterialDeleteDialog } from '@/features/materials/components/material-delete-dialog'

import { MaterialForm } from '@/features/materials/components/material-form'

import { MOVIMIENTO_TIPO_LABELS, UNIT_ABREV } from '@/features/materials/constants'

import {

  useDeleteMaterialMutation,

  useHistorialPreciosQuery,

  useMaterialQuery,

} from '@/features/materials/hooks/use-materials'

import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'

import { cn } from '@/lib/utils'



type TabId = 'movimientos' | 'historial'



function formatFechaHora(iso: string) {

  return new Date(iso).toLocaleString('es-VE', {

    dateStyle: 'short',

    timeStyle: 'short',

  })

}



export function MaterialDetallePage() {

  const { id } = useParams<{ id: string }>()

  const navigate = useNavigate()

  const { id: materialId, isValid: isValidMaterialId } = parsePositiveIntRouteParam(id)

  const [tab, setTab] = useState<TabId>('movimientos')

  const [ajusteOpen, setAjusteOpen] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)

  const deleteMutation = useDeleteMaterialMutation()



  const { data: material, isLoading, isError, error } = useMaterialQuery(materialId)

  const {

    data: historial,

    isLoading: historialLoading,

    isError: historialError,

    error: historialErr,

  } = useHistorialPreciosQuery(materialId)



  if (!isValidMaterialId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-muted-foreground text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'material',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/materials">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {

    return (

      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">

        <Loader2 className="size-4 animate-spin" />

        Cargando material…

      </div>

    )

  }



  if (isError || !material) {

    return (

      <div className="flex flex-col items-center gap-4 py-24">

        <p className={cn('text-sm whitespace-pre-line', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'material',
          })}
        </p>

        <Button variant="outline" asChild>

          <Link to="/productos/materiales">Volver al listado</Link>

        </Button>

      </div>

    )

  }



  const movimientos = material.movimientos ?? []

  const hasInventoryHistory =
    movimientos.length > 0 || (material.stockActual ?? 0) !== 0

  async function confirmDelete() {
    if (!material) return
    try {
      const result = await deleteMutation.mutateAsync(materialId)
      setDeleteOpen(false)
      if (result.modo === 'soft') {
        void navigate('/productos/materiales', {
          state: { message: `"${material.name}" fue desactivado (tiene historial de inventario).` },
        })
      } else {
        void navigate('/productos/materiales')
      }
    } catch (err) {
      notifyApiError(err)
      setDeleteOpen(false)
    }
  }



  return (

    <div className="flex flex-col gap-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="space-y-2">

          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>

            <Link to="/productos/materiales">

              <ArrowLeft />

              Materiales

            </Link>

          </Button>

          <h1 className="text-2xl font-semibold tracking-tight">
            {material.code} — {material.name}
          </h1>

        </div>

        <div className="flex flex-wrap gap-2">

          <Button variant="outline" onClick={() => setAjusteOpen(true)}>

            <Scale />

            Ajuste manual

          </Button>

          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>

            <Trash2 />

            Eliminar

          </Button>

        </div>

      </div>



      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del producto</CardTitle>
          <CardDescription>
            Editá la información del material. El precio costo se actualiza al confirmar compras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialForm material={material} mode="edit" variant="page" />
        </CardContent>
      </Card>



      <Card>

        <CardHeader>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <CardTitle className="text-base">Actividad</CardTitle>

              <CardDescription>Movimientos de inventario e historial de compras.</CardDescription>

            </div>

            <div className="bg-muted inline-flex rounded-lg p-1">

              <button

                type="button"

                className={cn(

                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',

                  tab === 'movimientos'

                    ? 'bg-background shadow-sm'

                    : 'text-muted-foreground hover:text-foreground'

                )}

                onClick={() => setTab('movimientos')}

              >

                Movimientos

              </button>

              <button

                type="button"

                className={cn(

                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',

                  tab === 'historial'

                    ? 'bg-background shadow-sm'

                    : 'text-muted-foreground hover:text-foreground'

                )}

                onClick={() => setTab('historial')}

              >

                Historial de precios

              </button>

            </div>

          </div>

        </CardHeader>

        <CardContent>

          {tab === 'movimientos' ? (

            movimientos.length === 0 ? (

              <p className="text-muted-foreground text-sm">Sin movimientos todavía.</p>

            ) : (

              <div className="overflow-x-auto rounded-md border">

                <table className="w-full text-sm">

                  <thead>

                    <tr className="bg-muted/50 border-b text-left">

                      <th className="px-4 py-3 font-medium">Fecha</th>

                      <th className="px-4 py-3 font-medium">Tipo</th>

                      <th className="px-4 py-3 font-medium">Cantidad</th>

                      <th className="px-4 py-3 font-medium">Nota</th>

                    </tr>

                  </thead>

                  <tbody>

                    {movimientos.map((mov) => (

                      <tr key={mov.id} className="border-b last:border-b-0">

                        <td className="text-muted-foreground px-4 py-3">

                          {formatFechaHora(mov.createdAt)}

                        </td>

                        <td className="px-4 py-3">{MOVIMIENTO_TIPO_LABELS[mov.type] ?? mov.type}</td>

                        <td className="px-4 py-3 font-medium tabular-nums">

                          {mov.quantity} {UNIT_ABREV[material.unit]}

                        </td>

                        <td className="text-muted-foreground px-4 py-3">{mov.note ?? '—'}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )

          ) : historialLoading ? (

            <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">

              <Loader2 className="size-4 animate-spin" />

              Cargando historial…

            </div>

          ) : historialError ? (
            <QueryErrorState
              isError
              error={historialErr}
              title="No se pudo cargar el historial"
              className="py-4"
            />
          ) : !historial?.length ? (

            <p className="text-muted-foreground text-sm">

              Sin compras confirmadas para este material.

            </p>

          ) : (

            <div className="overflow-x-auto rounded-md border">

              <table className="w-full text-sm">

                <thead>

                  <tr className="bg-muted/50 border-b text-left">

                    <th className="px-4 py-3 font-medium">Fecha</th>

                    <th className="px-4 py-3 font-medium">Proveedor</th>

                    <th className="px-4 py-3 font-medium">Factura</th>

                    <th className="px-4 py-3 font-medium">Cantidad</th>

                    <th className="px-4 py-3 font-medium">Precio unit.</th>

                    <th className="px-4 py-3 font-medium">Subtotal</th>

                    <th className="px-4 py-3 font-medium text-right">Compra</th>

                  </tr>

                </thead>

                <tbody>

                  {historial.map((row) => (

                    <tr key={row.purchaseItemId} className="border-b last:border-b-0">

                      <td className="px-4 py-3">{formatFecha(row.date)}</td>

                      <td className="px-4 py-3">{row.supplier.name}</td>

                      <td className="text-muted-foreground px-4 py-3">

                        {row.invoiceNumber ?? '—'}

                      </td>

                      <td className="px-4 py-3 tabular-nums">

                        {row.quantity} {UNIT_ABREV[material.unit]}

                      </td>

                      <td className="px-4 py-3">

                        <PrecioBimonetario

                          precioBs={row.unitPriceBs}

                          precioUsd={row.unitPriceUsd}

                          size="sm"

                        />

                      </td>

                      <td className="px-4 py-3">

                        <PrecioBimonetario

                          precioBs={row.subtotalBs}

                          precioUsd={row.subtotalUsd}

                          size="sm"

                        />

                      </td>

                      <td className="px-4 py-3 text-right">

                        <Button variant="ghost" size="sm" asChild>

                          <Link to={`/purchases/${row.purchaseId}`}>Ver</Link>

                        </Button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </CardContent>

      </Card>



      <AjusteStockDialog open={ajusteOpen} onOpenChange={setAjusteOpen} material={material} />

      <MaterialDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        material={material}
        hasInventoryHistory={hasInventoryHistory}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

    </div>

  )

}


