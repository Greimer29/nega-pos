import { DEFAULT_TICKET_PAPER_WIDTH_MM } from '@/features/printing/utils/print-format-defaults'

/** Shell mínimo de impresión; los estilos visuales viven en el bodyHtml de cada formato. */
export function ticketStyles(paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM): string {
  return `
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${paperWidthMm}mm;
      max-width: ${paperWidthMm}mm;
      overflow-x: hidden;
    }
    @media print {
      html, body {
        width: ${paperWidthMm}mm;
        max-width: ${paperWidthMm}mm;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `
}

export function wrapTicketHtml(body: string, paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket</title>
  <style>${ticketStyles(paperWidthMm)}</style>
</head>
<body>${body}</body>
</html>`
}
