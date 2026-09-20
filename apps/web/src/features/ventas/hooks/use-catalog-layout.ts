import { useAuth } from '@/features/auth/hooks/use-auth'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'

export type CatalogLayout = 'grid' | 'table'

const DEFAULT_CATALOG_LAYOUT: CatalogLayout = 'grid'

export function useCatalogLayout() {
  const { company } = useAuth()
  const [layout, setLayout] = useSessionPersistedState<CatalogLayout>(
    sessionFilterKey('catalog-layout', company?.id),
    DEFAULT_CATALOG_LAYOUT
  )

  function toggleLayout() {
    setLayout((prev) => (prev === 'grid' ? 'table' : 'grid'))
  }

  return { layout, toggleLayout }
}
