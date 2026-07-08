import { DEFAULT_TICKET_PAPER_WIDTH_MM } from '@/features/printing/utils/print-format-defaults'

function ticketContentStyles(selector: string, paperWidthMm: number): string {
  return `
    ${selector} {
      margin: 0;
      padding: 8px;
      width: ${paperWidthMm}mm;
      max-width: 100%;
      font-family: Consolas, "Courier New", monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #111;
      background: #fff;
      box-sizing: border-box;
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
    }
    ${selector} .comanda-item:last-child {
      border-bottom: none;
    }
  `
}

export function ticketStyles(paperWidthMm = DEFAULT_TICKET_PAPER_WIDTH_MM): string {
  return `
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
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
