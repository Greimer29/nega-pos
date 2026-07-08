import { Loader2, Pencil, Plus, Search, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { UserFormDialog } from '@/features/users/components/user-form-dialog'
import {
  useSetUserActiveMutation,
  useUsersQuery,
} from '@/features/users/hooks/use-users'
import type { AppUser } from '@/features/users/types'
import { isAppUserActionable, isAppUserListIncomplete } from '@/features/users/parse-app-user'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PER_PAGE = 20

function roleLabel(role: AppUser['role']) {
  return role === 'ADMIN' ? 'Administrador' : 'Operador'
}

function permissionsSummary(user: AppUser) {
  if (user.role === 'ADMIN') return 'Acceso total'

  const permissions = user.permissions ?? []
  if (permissions[0] === '*') return 'Acceso total'
  if (permissions.length === 0) return 'Sin permisos'

  return `${permissions.length} permiso${permissions.length === 1 ? '' : 's'}`
}

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const setActiveMutation = useSetUserActiveMutation()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useUsersQuery({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
  })

  const users = data?.users ?? []
  const meta = data?.meta
  const listIncomplete = isAppUserListIncomplete(users)

  function openCreateDialog() {
    setSelectedUser(null)
    setDialogOpen(true)
  }

  function openEditDialog(user: AppUser) {
    if (!isAppUserActionable(user)) {
      setActionError(
        'No se puede editar este usuario: la API no devolvió un identificador válido. Redeploy de la API requerido.'
      )
      return
    }
    setSelectedUser(user)
    setDialogOpen(true)
  }

  async function toggleActive(user: AppUser) {
    if (!isAppUserActionable(user)) {
      setActionError(
        'No se puede cambiar el estado: la API no devolvió un identificador válido. Redeploy de la API requerido.'
      )
      return
    }
    setActionError(null)
    try {
      await setActiveMutation.mutateAsync({ id: user.id, active: !user.active })
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Gestioná accesos y permisos por módulo.
          </p>
        </div>
        <PermissionGate permission="users.manage">
          <Button onClick={openCreateDialog}>
            <Plus />
            Nuevo usuario
          </Button>
        </PermissionGate>
      </div>

      {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

      {listIncomplete ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El listado llegó incompleto desde la API (sin id, nombre o email). Editar o activar/desactivar
          no funcionará hasta que Railway despliegue la última versión del backend con{' '}
          <code className="text-xs">serializeUser</code>.
        </p>
      ) : null}

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} usuario${meta.total === 1 ? '' : 's'} en total` : '—'}
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando usuarios…
            </div>
          ) : isError ? (
            <p className="text-destructive py-12 text-center text-sm whitespace-pre-line">
              {getApiErrorMessage(error)}
            </p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No hay usuarios que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Permisos</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.id > 0 ? user.id : `user-${user.email || index}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">{user.name.trim() || '—'}</td>
                      <td className="text-muted-foreground px-4 py-3">{user.email.trim() || '—'}</td>
                      <td className="px-4 py-3">{roleLabel(user.role)}</td>
                      <td className="text-muted-foreground px-4 py-3">
                        {permissionsSummary(user)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            user.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="users.manage">
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Editar ${user.name || 'usuario'}`}
                                onClick={() => openEditDialog(user)}
                                disabled={!isAppUserActionable(user)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={user.active ? 'Desactivar' : 'Activar'}
                                onClick={() => void toggleActive(user)}
                                disabled={!isAppUserActionable(user) || setActiveMutation.isPending}
                              >
                                <UserCog />
                              </Button>
                            </>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-4">
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

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={selectedUser} />
    </div>
  )
}
