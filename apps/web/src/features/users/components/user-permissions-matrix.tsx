import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  PERMISSION_GROUPS,
  type PermissionKey,
} from '@/features/permissions/catalog'
import { cn } from '@/lib/utils'

type UserPermissionsMatrixProps = {
  value: PermissionKey[]
  onChange: (permissions: PermissionKey[]) => void
  disabled?: boolean
  className?: string
}

export function UserPermissionsMatrix({
  value,
  onChange,
  disabled = false,
  className,
}: UserPermissionsMatrixProps) {
  function toggle(permission: PermissionKey, checked: boolean) {
    if (checked) {
      onChange([...new Set([...value, permission])])
      return
    }
    onChange(value.filter((item) => item !== permission))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(PERMISSION_GROUPS).map(([groupId, group]) => (
        <div key={groupId} className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">{group.label}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(group.permissions).map(([permission, label]) => {
              const key = permission as PermissionKey
              const checked = value.includes(key)

              return (
                <div key={permission} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`perm-${permission}`} className="text-sm font-normal">
                    {label}
                  </Label>
                  <Checkbox
                    id={`perm-${permission}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => toggle(key, event.target.checked)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
