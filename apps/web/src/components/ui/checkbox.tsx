import * as React from 'react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      role="checkbox"
      ref={ref}
      className={cn(
        'border-input text-primary focus-visible:ring-ring size-3.5 shrink-0 rounded-[4px] border shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
