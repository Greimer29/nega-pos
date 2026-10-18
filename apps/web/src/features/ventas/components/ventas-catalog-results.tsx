import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CatalogProductCard,
  catalogProductGridClassName,
} from '@/features/ventas/components/catalog-product-card'
import { CatalogProductTable } from '@/features/ventas/components/catalog-product-table'
import { MaterialCatalogTable } from '@/features/materials/components/material-catalog-table'
import { VentasMaterialCard } from '@/features/ventas/components/ventas-material-card'
import { EmptyListState, QueryErrorState } from '@/features/notifications/query-error-state'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import type { CatalogLayout } from '@/features/ventas/hooks/use-catalog-layout'
import type { CatalogSource } from '@/features/ventas/utils/ventas-catalog'
import { cn } from '@/lib/utils'

type CatalogPageMeta = {
  total: number
  currentPage: number
  lastPage: number
}

type VentasCatalogResultsProps = {
  source: CatalogSource
  layout: CatalogLayout
  products: CatalogProduct[]
  services: CatalogProduct[]
  materials: Material[]
  productsMeta?: CatalogPageMeta
  servicesMeta?: CatalogPageMeta
  materialsMeta?: CatalogPageMeta
  loadingProducts: boolean
  productsError: boolean
  productsQueryError: unknown
  loadingServices: boolean
  servicesError: boolean
  servicesQueryError: unknown
  loadingMaterials: boolean
  materialsError: boolean
  materialsQueryError: unknown
  onEditProduct: (product: CatalogProduct) => void
  onAddProduct: (product: CatalogProduct) => void
  onAddMaterial: (material: Material) => void
  onPageChange: (page: number) => void
}

function LoadingResults() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}

function CatalogPagination({
  meta,
  loading,
  onPageChange,
}: {
  meta?: CatalogPageMeta
  loading: boolean
  onPageChange: (page: number) => void
}) {
  if (!meta || meta.lastPage <= 1) return null

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-3">
      <p className="text-muted-foreground text-sm">
        Página {meta.currentPage} de {meta.lastPage}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.currentPage <= 1 || loading}
          onClick={() => onPageChange(Math.max(1, meta.currentPage - 1))}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.currentPage >= meta.lastPage || loading}
          onClick={() => onPageChange(meta.currentPage + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

export function VentasCatalogResults({
  source,
  layout,
  products,
  services,
  materials,
  productsMeta,
  servicesMeta,
  materialsMeta,
  loadingProducts,
  productsError,
  productsQueryError,
  loadingServices,
  servicesError,
  servicesQueryError,
  loadingMaterials,
  materialsError,
  materialsQueryError,
  onEditProduct,
  onAddProduct,
  onAddMaterial,
  onPageChange,
}: VentasCatalogResultsProps) {
  return (
    <>
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1">
        {source === 'products' ? (
          loadingProducts ? (
            <LoadingResults />
          ) : productsError ? (
            <QueryErrorState
              isError
              error={productsQueryError}
              title="No se pudo cargar el catálogo"
            />
          ) : products.length === 0 ? (
            <EmptyListState
              className="py-8"
              title="Todavía no hay productos en el catálogo"
              description="Es normal en una empresa nueva. Creá productos desde Productos o acá con Nuevo."
            />
          ) : layout === 'table' ? (
            <CatalogProductTable
              products={products}
              showActions
              onEdit={onEditProduct}
              onAddToCart={onAddProduct}
            />
          ) : (
            <div className={cn(catalogProductGridClassName, 'pb-1')}>
              {products.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  showActions
                  onEdit={onEditProduct}
                  onAddToCart={onAddProduct}
                />
              ))}
            </div>
          )
        ) : source === 'services' ? (
          loadingServices ? (
            <LoadingResults />
          ) : servicesError ? (
            <QueryErrorState
              isError
              error={servicesQueryError}
              title="No se pudieron cargar los servicios"
            />
          ) : services.length === 0 ? (
            <EmptyListState
              className="py-8"
              title="Todavía no hay servicios"
              description="Creá servicios en Productos → Servicios para venderlos acá sin descontar stock."
            />
          ) : layout === 'table' ? (
            <CatalogProductTable products={services} onAddToCart={onAddProduct} />
          ) : (
            <div className={cn(catalogProductGridClassName, 'pb-1')}>
              {services.map((service) => (
                <CatalogProductCard key={service.id} product={service} onAddToCart={onAddProduct} />
              ))}
            </div>
          )
        ) : loadingMaterials ? (
          <LoadingResults />
        ) : materialsError ? (
          <QueryErrorState
            isError
            error={materialsQueryError}
            title="No se pudieron cargar los materiales"
          />
        ) : materials.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No hay materiales activos.
          </p>
        ) : layout === 'table' ? (
          <MaterialCatalogTable materials={materials} onAddToCart={onAddMaterial} />
        ) : (
          <div className={cn(catalogProductGridClassName, 'pb-1')}>
            {materials.map((material) => (
              <VentasMaterialCard
                key={material.id}
                material={material}
                onAddToCart={onAddMaterial}
              />
            ))}
          </div>
        )}
      </div>

      {source === 'products' ? (
        <CatalogPagination
          meta={productsMeta}
          loading={loadingProducts}
          onPageChange={onPageChange}
        />
      ) : source === 'services' ? (
        <CatalogPagination
          meta={servicesMeta}
          loading={loadingServices}
          onPageChange={onPageChange}
        />
      ) : (
        <CatalogPagination
          meta={materialsMeta}
          loading={loadingMaterials}
          onPageChange={onPageChange}
        />
      )}
    </>
  )
}
