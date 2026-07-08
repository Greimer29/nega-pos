import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
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
import { useCreatePurchaseMutation } from '@/features/purchases/hooks/use-purchases'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { SupplierFormDialog } from '@/features/suppliers/components/supplier-form-dialog'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import type { Supplier } from '@/features/suppliers/types'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  supplier_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  account_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type NuevaPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NuevaPurchaseDialog({ open, onOpenChange }: NuevaPurchaseDialogProps) {
  const navigate = useNavigate()
  const createMutation = useCreatePurchaseMutation()
  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [createdSupplier, setCreatedSupplier] = useState<Supplier | null>(null)
  const [accountId, setAccountId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: '',
      date: new Date().toISOString().slice(0, 10),
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const purchase = await createMutation.mutateAsync({
        ...(values.supplier_id === '' || values.supplier_id === undefined
          ? {}
          : { supplier_id: Number(values.supplier_id) }),
        date: values.date,
        account_id: accountId,
      })
      onOpenChange(false)
      reset()
      setAccountId(null)
      void navigate(`/purchases/${purchase.id}`)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  const suppliers = useMemo(() => {
    const list = suppliersData?.suppliers ?? []
    if (createdSupplier && !list.some((s) => s.id === createdSupplier.id)) {
      return [createdSupplier, ...list]
    }
    return list
  }, [suppliersData?.suppliers, createdSupplier])

  function handlePurchaseDialogChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCreatedSupplier(null)
      setAccountId(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handlePurchaseDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comprar</DialogTitle>
            <DialogDescription>
              Podés elegir un proveedor o dejarlo vacío. La compra se abrirá en borrador para
              agregar ítems y confirmar en el detalle.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="supplier_id">Proveedor (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSupplierDialogOpen(true)}
                >
                  <Plus />
                  Nuevo proveedor
                </Button>
              </div>
              <select
                id="supplier_id"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                {...register('supplier_id')}
              >
                <option value="">Seleccionar…</option>
                {suppliers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Si no está en la lista, usá <span className="font-medium">Nuevo proveedor</span> o
                dejá el campo vacío para registrar la compra sin proveedor.
              </p>
              {errors.supplier_id ? (
                <p className="text-destructive text-sm">{errors.supplier_id.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de factura</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date ? (
                <p className="text-destructive text-sm">{errors.date.message}</p>
              ) : null}
            </div>

            <AccountSelect value={accountId} onChange={setAccountId} />

            {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handlePurchaseDialogChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                Continuar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onCreated={(supplier) => {
          setCreatedSupplier(supplier)
          setValue('supplier_id', supplier.id, { shouldValidate: true })
        }}
      />
    </>
  )
}
