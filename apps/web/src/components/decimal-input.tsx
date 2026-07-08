import * as React from 'react'

import { Input } from '@/components/ui/input'
import { formatDecimalOnBlur, resolveNumericInputStep, sanitizeDecimalInput } from '@/lib/numeric-input'

export type DecimalInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'step' | 'inputMode'
> & {
  /** Máximo de decimales permitidos al escribir (por defecto 2). */
  decimals?: number
  /** Incremento del input (por defecto `any` con decimales, `1` para enteros). */
  step?: number | 'any'
}

/**
 * Input numérico con límite de decimales. El `step` por defecto respeta la precisión
 * decimal para que el navegador no rechace valores como 12 cuando min="0.01".
 */
export const DecimalInput = React.forwardRef<HTMLInputElement, DecimalInputProps>(
  function DecimalInput({ decimals = 2, step, onChange, onBlur, ...props }, ref) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeDecimalInput(e.target.value, decimals)
      if (sanitized !== e.target.value) {
        e.target.value = sanitized
      }
      onChange?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const formatted = formatDecimalOnBlur(e.target.value, decimals)
      if (formatted !== e.target.value) {
        e.target.value = formatted
        onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>)
      }
      onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="number"
        step={resolveNumericInputStep(decimals, step)}
        inputMode="decimal"
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)

/** Alias para montos en USD/Bs (2 decimales, step 0.01 por defecto). */
export const MoneyInput = DecimalInput
