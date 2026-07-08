import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sin permiso</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Tu usuario no tiene acceso a esta sección. Pedile a un administrador que revise tus permisos.
      </p>
      <Button variant="outline" asChild>
        <Link to="/dashboard">Volver al dashboard</Link>
      </Button>
    </div>
  )
}
