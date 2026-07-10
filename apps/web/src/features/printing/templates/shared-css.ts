import { DEFAULT_TICKET_PAPER_WIDTH_MM } from '@/features/printing/utils/print-format-defaults'

function ticketContentStyles(selector: string, paperWidthMm: number): string {
  return `
    ${selector} {
      margin: 0;
      padding: 8px;
      width: ${paperWidthMm}mm;
      max-width: 100%;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      box-sizing: border-box;
      -webkit-font-smoothing: none;
      font-smooth: never;
    }
    ${selector} * { box-sizing: border-box; }
    ${selector} .center { text-align: center; }
    ${selector} .right { text-align: right; }
    ${selector} .bold { font-weight: 700; }
    ${selector} .muted { color: #444; }
    ${selector} .divider {
      border-top: 1px dashed #999;
      margin: 8px 0;
    }
    ${selector} .line-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 2px 0;
    }
    ${selector} .line-name {
      flex: 1;
      word-break: break-word;
    }
    ${selector} .line-qty {
      white-space: nowrap;
    }
    ${selector} .title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    ${selector} .signature {
      margin-top: 24px;
      border-top: 1px solid #333;
      padding-top: 4px;
      text-align: center;
      font-size: 10px;
    }
    ${selector} .comanda-item {
      margin: 8px 0;
      padding-bottom: 6px;
      border-bottom: 1px dashed #ccc;
      width: 100%;
      overflow: hidden;
    }
    ${selector} .comanda-item:last-child {
      border-bottom: none;
    }
    ${selector} .comanda-code,
    ${selector} .comanda-name,
    ${selector} .comanda-qty {
      width: 100%;
      text-align: left;
      word-break: break-word;
      margin: 2px 0;
    }
    ${selector} .comanda-formula-line {
      padding-left: 8px;
      margin: 1px 0;
      word-break: break-word;
    }
    ${selector} .invoice-line {
      margin: 6px 0;
    }
    ${selector} .invoice-line-name {
      margin-bottom: 2px;
      word-break: break-word;
    }
    ${selector} .invoice-line-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    ${selector} .invoice-line-table td {
      vertical-align: top;
      word-break: break-word;
    }
    ${selector} .invoice-line-table td.right {
      text-align: right;
      white-space: nowrap;
      width: 38%;
    }
    ${selector} .invoice-totals-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 4px;
    }
    ${selector} .invoice-totals-table td {
      vertical-align: top;
      padding: 2px 0;
    }
    ${selector} .invoice-totals-table td.right {
      text-align: right;
      white-space: nowrap;
      width: 45%;
    }
  `
}

export function ticketStyles(paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM): string {
  return `
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      body .muted {
        color: #000;
      }
    }
    ${ticketContentStyles('body', paperWidthMm)}
  `
}

export const TICKET_PREVIEW_ROOT_CLASS = 'ticket-preview-root'

export function ticketPreviewStyles(
  paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM,
  rootClass = TICKET_PREVIEW_ROOT_CLASS
): string {
  return ticketContentStyles(`.${rootClass}`, paperWidthMm)
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
