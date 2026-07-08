import { Navigate, useParams } from 'react-router-dom'

export function RedirectOrderDetail() {
  const { id } = useParams()
  return <Navigate to={`/orders/${id}`} replace />
}
