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
import {
  PERMISSION_PRESETS,
  type PermissionKey,
  type PermissionPresetId,
} from '@/features/permissions/catalog'
import { UserPermissionsMatrix } from '@/features/users/components/user-permissions-matrix'
import { useCreateUserMutation, useUpdateUserMutation } from '@/features/users/hooks/use-users'
import { isAppUserActionable } from '@/features/users/parse-app-user'
import type { AppUser, AppUserRole } from '@/features/users/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AppUser | null
}

const selectClassName = cn(
  'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
)

function normalizePermissions(user?: AppUser | null): PermissionKey[] {
  if (!user?.permissions?.length || user.permissions[0] === '*') return []
  return user.permissions as PermissionKey[]
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = Boolean(user)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppUserRole>('OPERATOR')
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [preset, setPreset] = useState<PermissionPresetId>('custom')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateUserMutation()
  const updateMutation = useUpdateUserMutation()

  useEffect(() => {
    if (!open) return
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPassword('')
    setRole(user?.role ?? 'OPERATOR')
    setPermissions(normalizePermissions(user))
    setPreset('custom')
    setError(null)
  }, [open, user])

  function applyPreset(nextPreset: PermissionPresetId) {
    setPreset(nextPreset)
    if (nextPreset === 'custom') return
    setPermissions([...PERMISSION_PRESETS[nextPreset].permissions])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim()) {
      setError('Completá nombre y email.')
      return
    }

    if (!isEdit && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role,
        permissions: role === 'OPERATOR' ? permissions : undefined,
        ...(password ? { password } : {}),
      }

      if (isEdit && user) {
        if (!isAppUserActionable(user)) {
          setError('Este usuario no tiene id válido en la API. No se puede guardar.')
          return
        }
        await updateMutation.mutateAsync({ id: user.id, payload })
      } else {
        await createMutation.mutateAsync({ ...payload, password })
      }

      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualizá datos y permisos del usuario.'
              : 'Creá un usuario operador o administrador.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre *</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-password">
                {isEdit ? 'Nueva contraseña' : 'Contraseña *'}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? 'Dejar vacío para no cambiar' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rol *</Label>
              <select
                id="user-role"
                className={selectClassName}
                value={role}
                onChange={(e) => setRole(e.target.value as AppUserRole)}
              >
                <option value="OPERATOR">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          {role === 'OPERATOR' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="user-preset">Aplicar perfil</Label>
                <select
                  id="user-preset"
                  className={selectClassName}
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value as PermissionPresetId)}
                >
                  <option value="custom">Personalizado</option>
                  <option value="vendedor">{PERMISSION_PRESETS.vendedor.label}</option>
                  <option value="inventario">{PERMISSION_PRESETS.inventario.label}</option>
                  <option value="contador">{PERMISSION_PRESETS.contador.label}</option>
                </select>
              </div>
              <UserPermissionsMatrix value={permissions} onChange={setPermissions} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Los administradores tienen acceso total a la aplicación.
            </p>
          )}

          {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
