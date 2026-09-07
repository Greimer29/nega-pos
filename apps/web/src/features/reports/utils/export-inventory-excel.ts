import type {
  InventoryProductMovement,
  InventoryReportProduct,
} from '@/features/reports/types'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(value: string | number, type: 'String' | 'Number' = 'String') {
  if (type === 'Number' && (value === '' || value === null || value === undefined)) {
    return `<Cell><Data ss:Type="String"></Data></Cell>`
  }
  return `<Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`
}

function downloadSpreadsheet(filename: string, xml: string) {
  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function workbookShell(sheetName: string, rowsXml: string) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Reporte de inventario</Title>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>18000</WindowWidth>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
${rowsXml}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Portrait"/>
    <PageMargins x:Bottom="0.5" x:Left="0.5" x:Right="0.5" x:Top="0.5"/>
   </PageSetup>
   <FitToPage/>
   <Print>
    <FitWidth>1</FitWidth>
    <FitHeight>0</FitHeight>
    <ValidPrinterInfo/>
    <PaperSizeIndex>9</PaperSizeIndex>
   </Print>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`
}

type MoneyFormatter = (amountUsd: number) => string

export function exportInventoryReportExcel(options: {
  products: InventoryReportProduct[]
  filtersSummary: string
  formatMoney: MoneyFormatter
}) {
  const headerCells = [
    'Código',
    'Tipo',
    'Descripción',
    'Talla',
    'Cantidad',
    'Unidad',
    'Precio',
    'Costo',
    'Categoría',
  ]
    .map((label) => cell(label))
    .join('')

  const rows: string[] = []
  rows.push(`   <Row ss:StyleID="Title">${cell('Reporte de inventario')}</Row>`)
  rows.push(`   <Row>${cell(options.filtersSummary)}</Row>`)
  rows.push(`   <Row ss:StyleID="Header">${headerCells}</Row>`)

  for (const product of options.products) {
    const kindLabel = product.kind === 'material' ? 'Material' : 'Producto'
    const lines =
      product.lines.length > 0 ? product.lines : [{ size: null, quantity: product.total_quantity }]

    lines.forEach((line, index) => {
      const isFirst = index === 0
      rows.push(
        `   <Row>${[
          cell(isFirst ? product.code : ''),
          cell(isFirst ? kindLabel : ''),
          cell(isFirst ? product.description : ''),
          cell(line.size?.trim() ? line.size : '—'),
          cell(Number(line.quantity), 'Number'),
          cell(product.sale_unit),
          cell(isFirst ? options.formatMoney(Number(product.sale_price_usd)) : ''),
          cell(
            isFirst
              ? product.cost_usd != null
                ? options.formatMoney(Number(product.cost_usd))
                : '—'
              : ''
          ),
          cell(isFirst ? product.category : ''),
        ].join('')}</Row>`
      )
    })
  }

  downloadSpreadsheet('reporte-inventario', workbookShell('Inventario', rows.join('\n')))
}

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_IN: 'Compra',
  SALE_OUT: 'Venta',
  MANUAL_ADJUSTMENT: 'Ajuste',
  MANUAL_CARGO: 'Ajuste (+)',
  MANUAL_DESCARGO: 'Ajuste (-)',
  REVERSAL_ADJUSTMENT: 'Reversión',
}

export function exportInventoryMovementsExcel(options: {
  product: InventoryReportProduct
  movements: InventoryProductMovement[]
  periodLabel: string
}) {
  const headerCells = ['Fecha', 'Tipo', 'Cantidad', 'Nota', 'Venta', 'Pedido', 'Compra']
    .map((label) => cell(label))
    .join('')

  const rows: string[] = []
  rows.push(`   <Row ss:StyleID="Title">${cell(`Movimientos — ${options.product.description}`)}</Row>`)
  rows.push(
    `   <Row>${cell(`Código ${options.product.code} · ${options.periodLabel}`)}</Row>`
  )
  rows.push(`   <Row ss:StyleID="Header">${headerCells}</Row>`)

  for (const movement of options.movements) {
    const date = movement.created_at
      ? new Date(movement.created_at).toLocaleString('es-VE')
      : '—'
    rows.push(
      `   <Row>${[
        cell(date),
        cell(MOVEMENT_LABELS[movement.type] ?? movement.type),
        cell(Number(movement.quantity), 'Number'),
        cell(movement.note ?? ''),
        cell(movement.sale_code ?? (movement.sale_id ? `#${movement.sale_id}` : '')),
        cell(movement.order_code ?? (movement.order_id ? `#${movement.order_id}` : '')),
        cell(movement.purchase_id ? `#${movement.purchase_id}` : ''),
      ].join('')}</Row>`
    )
  }

  downloadSpreadsheet(
    `movimientos-inventario-${options.product.code}`,
    workbookShell('Movimientos', rows.join('\n'))
  )
}
