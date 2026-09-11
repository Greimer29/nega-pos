import { CreditCard, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentMethodFormDialog } from '@/features/payment-methods/components/payment-method-form-dialog'
import {
  useDeletePaymentMethodMutation,
  usePaymentMethodsQuery,
  useUpdatePaymentMethodMutation,
} from '@/features/payment-methods/hooks/use-payment-methods'
import type { PaymentMethod } from '@/features/payment-methods/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { cn } from '@/lib/utils'
import { toolbarHeaderClass } from '@/components/layout/responsive-toolbar'

export function PaymentMethodsConfigCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  const { data: methods = [], isLoading, isError, error } = usePaymentMethodsQuery()
  const updateMutation = useUpdatePaymentMethodMutation()
  const deleteMutation = useDeletePaymentMethodMutation()

  function openCreate() {
    setSelectedMethod(null)
    setDialogOpen(true)
  }

  function openEdit(method: PaymentMethod) {
    setSelectedMethod(method)
    setDialogOpen(true)
  }

  async function toggleActive(method: PaymentMethod) {
    try {
      await updateMutation.mutateAsync({
        code: method.code,
        payload: { is_active: !method.is_active },
      })
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleDelete(method: PaymentMethod) {
    if (!window.confirm(`¿Eliminar o desactivar el método "${method.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(method.code)
    } catch (err) {
      notifyApiError(err)
    }
  }

  return (
    <Card>
      <CardHeader className={toolbarHeaderClass}>
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Métodos de pago
          </CardTitle>
          <CardDescription>
            Configurá las formas de cobro disponibles al confirmar ventas de contado. Cada método
            usa la tasa de su moneda asociada.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nuevo método
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isError ? (
          <QueryErrorState isError error={error} title="No se pudieron cargar los métodos de pago" />
        ) : methods.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay métodos de pago configurados.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Moneda</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => (
                  <tr key={method.code} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{method.name}</td>
                    <td className="text-muted-foreground px-4 py-3 font-mono">{method.code}</td>
                    <td className="px-4 py-3">{method.currency_code}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          method.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-muted text-muted-foreground'
                        )}
                        onClick={() => void toggleActive(method)}
                      >
                        {method.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(method)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => void handleDelete(method)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <PaymentMethodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} method={selectedMethod} />
    </Card>
  )
}
