import { useCallback, useState } from 'react'
import { ScanBarcode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { scanBarcodeWithCamera } from '@/lib/barcode-scan'
import { cn } from '@/lib/utils'

type BarcodeScanButtonProps = {
  onScan: (code: string) => void | Promise<void>
  className?: string
  disabled?: boolean
  title?: string
}

export function BarcodeScanButton({
  onScan,
  className,
  disabled,
  title = 'Escanear código de barras',
}: BarcodeScanButtonProps) {
  const [scanning, setScanning] = useState(false)

  const handleClick = useCallback(async () => {
    setScanning(true)
    try {
      const code = await scanBarcodeWithCamera()
      if (code) {
        await onScan(code)
      }
    } finally {
      setScanning(false)
    }
  }, [onScan])

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('shrink-0', className)}
      disabled={disabled || scanning}
      title={title}
      aria-label={title}
      onClick={() => void handleClick()}
    >
      <ScanBarcode className={cn('size-4', scanning && 'animate-pulse')} />
    </Button>
  )
}
