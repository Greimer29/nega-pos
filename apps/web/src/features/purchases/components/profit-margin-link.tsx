import { Percent } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { profitMarginUrl } from '@/features/purchases/constants'

type ProfitMarginLinkProps = {
  productId?: number
  variant?: 'default' | 'outline' | 'ghost'
}

export function ProfitMarginLink({ productId, variant = 'outline' }: ProfitMarginLinkProps) {
  return (
    <Button
      variant={variant}
      size="icon"
      asChild
      title="Margen de ganancia"
      aria-label="Margen de ganancia"
    >
      <Link to={profitMarginUrl(productId ? { productId } : undefined)}>
        <Percent className="size-4" />
      </Link>
    </Button>
  )
}
