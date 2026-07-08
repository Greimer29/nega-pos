import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CircularImageField } from '@/components/circular-image-field'
import { Button } from '@/components/ui/button'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CATEGORIA_LABELS,
  DEFAULT_UNIT_BY_CATEGORY,
  MATERIAL_CATEGORIAS,
  MATERIAL_UNITES,
  UNIT_ABREV,
  materialImageUrl,
  materialStockDisponible,
} from '@/features/materials/constants'
import { StockBadge } from '@/features/materials/components/stock-badge'
import {
  useCreateMaterialMutation,
  useDeleteMaterialImageMutation,
  useMaterialQuery,
  useUpdateMaterialMutation,
  useUploadMaterialImageMutation,
} from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCostWarningsMessage } from '@/lib/cost-warnings'

const materialSchema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio').max(30),
  name: z.string().trim().min(1, 'El producto es obligatorio').max(150),
  description: z.string().trim().optional(),
  category: z.enum(MATERIAL_CATEGORIAS),
  unit: z.enum(MATERIAL_UNITES),
  stock_minimo: z.coerce.number().min(0).optional(),
  location: z.string().trim().max(100).optional(),
  supplier_habitual_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
  last_purchase_price_usd: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  active: z.boolean().optional(),
})

type MaterialFormInput = z.input<typeof materialSchema>
type MaterialFormValues = z.infer<typeof materialSchema>

export type MaterialFormProps = {
  material?: Material | null
  mode: 'create' | 'edit'
  variant: 'dialog' | 'page'
  onSuccess?: (material: Material) => void
  onCancel?: () => void
  purchaseFlow?: boolean
}

function emptyValues(): MaterialFormInput {
  return {
    code: '',
    name: '',
    description: '',
    category: 'FABRIC',
    unit: DEFAULT_UNIT_BY_CATEGORY.FABRIC,
    stock_minimo: 1,
    location: '',
    supplier_habitual_id: '',
    last_purchase_price_usd: '',
    active: true,
  }
}

function toFormValues(material: Material): MaterialFormInput {
  return {
    code: material.code,
    name: material.name,
    description: material.description ?? '',
    category: material.category,
    unit: material.unit,
    stock_minimo: Number(material.minimumStock),
    location: material.location ?? '',
    supplier_habitual_id: material.defaultSupplierId ?? '',
    last_purchase_price_usd: material.lastPurchasePriceUsd
      ? Number(material.lastPurchasePriceUsd)
      : '',
    active: material.active,
  }
}

function toPayload(values: MaterialFormValues) {
  const optionalNumber = (value: number | '' | undefined) =>
    value === '' || value === undefined ? undefined : Number(value)

  return {
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    category: values.category,
    unit: values.unit,
    stock_minimo: values.stock_minimo ?? 1,
    location: values.location?.trim() || undefined,
    supplier_habitual_id:
      values.supplier_habitual_id === '' ? undefined : Number(values.supplier_habitual_id),
    last_purchase_price_usd: optionalNumber(values.last_purchase_price_usd),
    ...(values.active !== undefined ? { active: values.active } : {}),
  }
}

export function MaterialForm({
  material,
  mode,
  variant,
  onSuccess,
  onCancel,
  purchaseFlow = false,
}: MaterialFormProps) {
  const isEditing = mode === 'edit'
  const { data: liveMaterial } = useMaterialQuery(isEditing && material ? material.id : 0)
  const displayMaterial = liveMaterial ?? material
  const createMutation = useCreateMaterialMutation()
  const updateMutation = useUpdateMaterialMutation()
  const uploadImageMutation = useUploadMaterialImageMutation()
  const deleteImageMutation = useDeleteMaterialImageMutation()
  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [costWarning, setCostWarning] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl)
      }
    }
  }, [pendingPreviewUrl])

  function clearPendingImage() {
    setPendingImageFile(null)
    setPendingPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return null
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormInput, unknown, MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: emptyValues(),
  })

  const watchedCategory = watch('category')

  useEffect(() => {
    if (isEditing) {
      return
    }
    setValue('unit', DEFAULT_UNIT_BY_CATEGORY[watchedCategory])
  }, [isEditing, watchedCategory, setValue])

  useEffect(() => {
    if (isEditing && material) {
      reset(toFormValues(material))
      setImageError(null)
      clearPendingImage()
    } else if (!isEditing) {
      reset(emptyValues())
      setImageError(null)
      clearPendingImage()
    }
  }, [isEditing, material, reset])

  async function handleSelectImage(file: File) {
    setImageError(null)

    clearPendingImage()
    setPendingImageFile(file)
    setPendingPreviewUrl(URL.createObjectURL(file))

    const materialId = displayMaterial?.id ?? material?.id
    if (isEditing && materialId) {
      try {
        await uploadImageMutation.mutateAsync({ id: materialId, file })
        clearPendingImage()
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  async function handleRemoveImage() {
    setImageError(null)

    const hadServerImage = Boolean(
      isEditing && (displayMaterial?.imagePath ?? material?.imagePath)
    )
    const materialId = displayMaterial?.id ?? material?.id

    clearPendingImage()

    if (hadServerImage && materialId) {
      try {
        await deleteImageMutation.mutateAsync(materialId)
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setCostWarning(null)
    try {
      const payload = toPayload(values)

      if (isEditing && material) {
        const { material: updated, costWarnings } = await updateMutation.mutateAsync({
          id: material.id,
          payload,
        })
        const warningMessage = formatCostWarningsMessage(costWarnings)
        if (warningMessage) {
          setCostWarning(warningMessage)
        }
        onSuccess?.(updated)
      } else {
        const created = await createMutation.mutateAsync(payload)
        let result = created
        if (pendingImageFile) {
          result = await uploadImageMutation.mutateAsync({ id: created.id, file: pendingImageFile })
        }
        onSuccess?.(result)
      }
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  const showCostPrice = isEditing && !purchaseFlow

  const imagePending = uploadImageMutation.isPending || deleteImageMutation.isPending

  const footer = (
    <div
      className={
        variant === 'dialog'
          ? 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'
          : 'flex flex-wrap gap-2'
      }
    >
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Guardando…
          </>
        ) : isEditing ? (
          'Guardar cambios'
        ) : (
          'Crear material'
        )}
      </Button>
    </div>
  )

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex gap-4">
        <div className="flex w-1/3 justify-center">
          <CircularImageField
            imageUrl={
              displayMaterial?.imagePath ? materialImageUrl(displayMaterial.id) : null
            }
            pendingPreviewUrl={pendingPreviewUrl}
            alt={displayMaterial?.name ?? 'Material'}
            pending={imagePending}
            error={imageError}
            onSelectFile={(file) => void handleSelectImage(file)}
            onRemove={() => void handleRemoveImage()}
          />
        </div>
        <div className="flex w-2/3 flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código interno *</Label>
            <Input id="code" {...register('code')} />
            {errors.code ? <p className="text-destructive text-sm">{errors.code.message}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Producto *</Label>
            <Input id="name" placeholder="Ej. Muselina stretch negra" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
            {variant === 'page' && isEditing && displayMaterial && displayMaterial.stockActual !== undefined ? (
              (() => {
                const { stock, comprometido, disponible } = materialStockDisponible(displayMaterial)
                const unit = UNIT_ABREV[displayMaterial.unit]
                if (comprometido > 0) {
                  return (
                    <p className="text-muted-foreground pt-0.5 text-sm tabular-nums">
                      Stock: {stock} {unit} · Comprometido: {comprometido} {unit} · Disponible:{' '}
                      {disponible} {unit}
                    </p>
                  )
                }
                return (
                  <StockBadge
                    variant="subtitle"
                    stockActual={stock}
                    stockMinimo={Number(displayMaterial.minimumStock)}
                    unitLabel={unit}
                    className="pt-0.5"
                  />
                )
              })()
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría *</Label>
          <select
            id="category"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            {...register('category')}
          >
            {MATERIAL_CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORIA_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unidad *</Label>
          <select
            id="unit"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            {...register('unit')}
          >
            {MATERIAL_UNITES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="stock_minimo">Stock mínimo</Label>
          <DecimalInput id="stock_minimo" min="0" decimals={2} {...register('stock_minimo')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier_habitual_id">Proveedor habitual</Label>
          <select
            id="supplier_habitual_id"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            {...register('supplier_habitual_id')}
          >
            <option value="">— Ninguno —</option>
            {(suppliersData?.suppliers ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showCostPrice ? (
        <div className="space-y-2">
          <Label htmlFor="last_purchase_price_usd">Precio costo (USD)</Label>
          <MoneyInput
            id="last_purchase_price_usd"
            min="0"
            placeholder="0.00"
            {...register('last_purchase_price_usd')}
          />
          <p className="text-muted-foreground text-xs">
            También se actualiza al confirmar una compra. Si cambia, se recalcula el costo de los
            productos con fórmula.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="location">Ubicación</Label>
        <Input id="location" {...register('location')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={2} {...register('description')} />
      </div>

      {isEditing ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 rounded border" {...register('active')} />
          Material activo
        </label>
      ) : null}

      {costWarning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 whitespace-pre-line">
          {costWarning}
        </p>
      ) : null}

      {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

      {footer}
    </form>
  )
}
