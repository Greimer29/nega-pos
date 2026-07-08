import { resolvePublicAssetUrl } from '@/lib/api'

export function supplierImageUrl(supplierId: number) {
  return resolvePublicAssetUrl(`/suppliers/${supplierId}/image`)
}
