import { Navigate, useParams } from 'react-router-dom'

export function RedirectMaterialDetail() {
  const { id } = useParams()
  return <Navigate to={`/productos/materiales/${id}`} replace />
}
