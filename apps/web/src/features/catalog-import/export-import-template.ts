import {
  getImportColumns,
  importKindLabel,
  importTemplateFilename,
} from '@/features/catalog-import/columns'
import type { CatalogImportKind } from '@/features/catalog-import/types'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(value: string, styleId?: string) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
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

function instructionsFor(kind: CatalogImportKind) {
  const entity = importKindLabel(kind)
  return (
    `No borres la fila de encabezados. Los campos con * son obligatorios. ` +
    `Completá hasta 200 ${entity}. Unidades válidas: UND, PAR, CAJ, ROL, SET, MTS, KG. ` +
    `Si la categoría no existe, Nega POS la crea. ` +
    `Esta plantilla no incluye imágenes, tallas ni fórmulas.`
  )
}

export function buildImportTemplateXml(kind: CatalogImportKind) {
  const columns = getImportColumns(kind)
  const title = `Plantilla de importación — ${importKindLabel(kind)}`
  const sheetName = importKindLabel(kind).slice(0, 31)
  const headerCells = columns
    .map((column) => cell(column.header, column.required ? 'RequiredHeader' : 'Header'))
    .join('')
  const hintCells = columns.map((column) => cell(column.hint)).join('')
  const emptyRow = columns.map(() => cell('')).join('')

  const rows: string[] = [
    `   <Row ss:StyleID="Title">${cell(title)}</Row>`,
    `   <Row>${cell(instructionsFor(kind))}</Row>`,
    `   <Row ss:StyleID="Header">${headerCells}</Row>`,
    `   <Row ss:StyleID="Hint">${hintCells}</Row>`,
  ]

  for (let index = 0; index < 20; index += 1) {
    rows.push(`   <Row>${emptyRow}</Row>`)
  }

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(title)}</Title>
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
  <Style ss:ID="RequiredHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#7F1D1D"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Hint">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Italic="1" ss:Color="#6B7280"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
${rows.join('\n')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>4</SplitHorizontal>
   <TopRowBottomPane>4</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`
}

export function downloadImportTemplate(kind: CatalogImportKind) {
  downloadSpreadsheet(importTemplateFilename(kind), buildImportTemplateXml(kind))
}
