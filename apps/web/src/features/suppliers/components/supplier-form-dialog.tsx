import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CircularImageField } from '@/components/circular-image-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supplierImageUrl } from '@/features/suppliers/constants'
import {
  useCreateSupplierMutation,
  useDeleteSupplierImageMutation,
  useUpdateSupplierMutation,
  useUploadSupplierImageMutation,
} from '@/features/suppliers/hooks/use-suppliers'
import type { Supplier } from '@/features/suppliers/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { normalizeRif } from '@/lib/rif'

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  rif: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .email('Ingresá un email válido')
    .max(150)
    .optional()
    .or(z.literal('')),
  notes: z.string().trim().optional(),
  offers_credit: z.boolean(),
  credit_days: z.number().min(0).max(365).optional(),
  active: z.boolean().optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

type SupplierFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
  onCreated?: (supplier: Supplier) => void
}

function emptyValues(): SupplierFormValues {
  return {
    name: '',
    rif: '',
    phone: '',
    email: '',
    notes: '',
    offers_credit: false,
    credit_days: 30,
    active: true,
  }
}

function toFormValues(supplier: Supplier): SupplierFormValues {
  const days = supplier.creditDays ?? 0
  return {
    name: supplier.name,
    rif: supplier.rif ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    notes: supplier.notes ?? '',
    offers_credit: days > 0,
    credit_days: days > 0 ? days : 30,
    active: supplier.active,
  }
}

function toPayload(values: SupplierFormValues) {
  const rifRaw = values.rif?.trim()

  return {
    name: values.name.trim(),
    rif: rifRaw ? normalizeRif(rifRaw) : undefined,
    phone: values.phone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    credit_days: values.offers_credit ? (values.credit_days ?? 0) : 0,
    ...(values.active !== undefined ? { active: values.active } : {}),
  }
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onCreated }: SupplierFormDialogProps) {
  const isEditing = supplier != null
  const createMutation = useCreateSupplierMutation()
  const updateMutation = useUpdateSupplierMutation()
  const uploadImageMutation = useUploadSupplierImageMutation()
  const deleteImageMutation = useDeleteSupplierImageMutation()
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptyValues(),
  })

  const offersCredit = watch('offers_credit')

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
  }, [pendingPreviewUrl])

  useEffect(() => {
    if (open) {
      reset(isEditing ? toFormValues(supplier) : emptyValues())
      setImageError(null)
      setPendingImageFile(null)
      setPendingPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [open, isEditing, supplier, reset])

  async function handleSelectImage(file: File) {
    setImageError(null)

    setPendingImageFile(file)
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })

    if (isEditing && supplier) {
      try {
        await uploadImageMutation.mutateAsync({ id: supplier.id, file })
        setPendingImageFile(null)
        setPendingPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  async function handleRemoveImage() {
    setImageError(null)

    setPendingImageFile(null)
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    if (isEditing && supplier?.imagePath) {
      try {
        await deleteImageMutation.mutateAsync(supplier.id)
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values)

      if (isEditing) {
        await updateMutation.mutateAsync({ id: supplier.id, payload })
      } else {
        const created = await createMutation.mutateAsync(payload)
        if (pendingImageFile) {
          await uploadImageMutation.mutateAsync({ id: created.id, file: pendingImageFile })
        }
        onCreated?.(created)
      }

      onOpenChange(false)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  const imagePending = uploadImageMutation.isPending || deleteImageMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-5" onSubmit={onSubmit}>
          <section className="flex gap-5">
            <CircularImageField
              imageUrl={supplier?.imagePath ? supplierImageUrl(supplier.id) : null}
              pendingPreviewUrl={pendingPreviewUrl}
              alt={supplier?.name ?? 'Proveedor'}
              pending={imagePending}
              error={imageError}
              onSelectFile={(file) => void handleSelectImage(file)}
              onRemove={() => void handleRemoveImage()}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" autoComplete="organization" {...register('name')} />
                {errors.name ? (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rif">RIF</Label>
                <Input
                  id="rif"
                  placeholder="J-12345678-9"
                  {...register('rif')}
                  onBlur={(event) => {
                    const raw = event.target.value.trim()
                    if (raw) setValue('rif', normalizeRif(raw), { shouldDirty: true })
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" placeholder="0412 833 2238" {...register('phone')} />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} {...register('notes')} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  {...register('offers_credit')}
                />
                Ofrece crédito
              </label>
              {offersCredit ? (
                <div className="flex items-center gap-2">
                  <Label htmlFor="credit_days" className="text-sm font-normal">
                    Días
                  </Label>
                  <Input
                    id="credit_days"
                    type="number"
                    min={1}
                    max={365}
                    className="w-20"
                    {...register('credit_days', { valueAsNumber: true })}
                  />
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 rounded border" {...register('active')} />
                Proveedor activo
              </label>
            ) : null}
          </section>

          {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Guardando…
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear proveedor'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
