import { Loader2, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SupplierDeleteDialog } from '@/features/suppliers/components/supplier-delete-dialog'
import { SupplierFormDialog } from '@/features/suppliers/components/supplier-form-dialog'
import {
  useDeleteSupplierMutation,
  useSuppliersQuery,
} from '@/features/suppliers/hooks/use-suppliers'
import type { Supplier } from '@/features/suppliers/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

function formatRif(rif: string | null) {
  return rif ?? '—'
}

function formatTelefono(phone: string | null) {
  return phone ?? '—'
}

export function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteMutation = useDeleteSupplierMutation()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useSuppliersQuery({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
  })

  const suppliers = data?.suppliers ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setSelectedSupplier(null)
    setDialogOpen(true)
  }

  function openEditDialog(supplier: Supplier) {
    setSelectedSupplier(supplier)
    setDialogOpen(true)
  }

  function openDeleteDialog(supplier: Supplier) {
    setSupplierToDelete(supplier)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!supplierToDelete) {
      return
    }

    setActionError(null)

    try {
      const result = await deleteMutation.mutateAsync(supplierToDelete.id)
      setDeleteDialogOpen(false)
      setSupplierToDelete(null)

      if (result.modo === 'soft') {
        setActionError(
          `"${supplierToDelete.name}" fue desactivado porque tiene registros asociados.`
        )
      }
    } catch (deleteError) {
      setActionError(getApiErrorMessage(deleteError))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm">Gestioná los proveedores del taller.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus />
          Nuevo proveedor
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} proveedor${meta.total === 1 ? '' : 'es'} en total` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o RIF…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando proveedores…
            </div>
          ) : isError ? (
            <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
              {getApiErrorMessage(error)}
            </p>
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {debouncedSearch
                  ? 'No hay proveedores que coincidan con la búsqueda.'
                  : 'Todavía no hay proveedores cargados.'}
              </p>
              {!debouncedSearch ? (
                <Button className="mt-4" variant="outline" onClick={openCreateDialog}>
                  <Plus />
                  Crear el primero
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">RIF</th>
                    <th className="px-4 py-3 font-medium">Teléfono</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{supplier.name}</td>
                      <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                        {formatRif(supplier.rif)}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{formatTelefono(supplier.phone)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            supplier.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {supplier.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Estado de cuenta ${supplier.name}`} asChild>
                            <Link to={`/suppliers/${supplier.id}/cuenta`}>
                              <Wallet />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${supplier.name}`}
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Eliminar ${supplier.name}`}
                            onClick={() => openDeleteDialog(supplier)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Página {meta.currentPage} de {meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
      />

      <SupplierDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setSupplierToDelete(null)
          }
        }}
        supplier={supplierToDelete}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
