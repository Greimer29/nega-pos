import type { PrintConfig, PrintDocumentKind } from '@/features/printing/types'
import { renderSaleDocument, type RenderedDocument } from '@/features/printing/render-document'
import type { Sale } from '@/features/ventas/types'

type DocumentPreviewProps = {
  kind: PrintDocumentKind
  sale: Sale
  config: Pick<PrintConfig, 'business' | 'formats' | 'documents' | 'ticket'>
}

export function DocumentPreview({ kind, sale, config }: DocumentPreviewProps) {
  const rendered: RenderedDocument = renderSaleDocument(kind, sale, config)
  const paperWidthMm = config.documents[kind].paperWidthMm
  const bodyMatch = rendered.html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  const bodyHtml = bodyMatch?.[1] ?? ''

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div
        className="mx-auto bg-white text-black"
        style={{ width: `${paperWidthMm}mm`, maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  )
}
