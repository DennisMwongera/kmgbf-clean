// ─── Chart → Image export ─────────────────────────────────────
export function downloadCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpg' = 'png'
) {
  const type = format === 'jpg' ? 'image/jpeg' : 'image/png'
  const ext  = format === 'jpg' ? 'jpg' : 'png'

  // Draw white background for jpg (canvas is transparent by default)
  const out = document.createElement('canvas')
  out.width  = canvas.width
  out.height = canvas.height
  const ctx  = out.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0)

  const link = document.createElement('a')
  link.download = `${filename}.${ext}`
  link.href     = out.toDataURL(type, 0.95)
  link.click()
}

// ─── Table → CSV export ───────────────────────────────────────
export function downloadCSV(rows: (string | number | null)[][], filename: string) {
  const csv = rows
    .map(row => row.map(cell => {
      const v = cell === null || cell === undefined ? '' : String(cell)
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href     = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

// ─── Table → XLSX export ─────────────────────────────────────
export async function downloadXLSX(
  sheets: { name: string; rows: (string | number | null)[][] }[],
  filename: string
) {
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 31))
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ─── Chart data → CSV export ─────────────────────────────────
export function downloadChartDataCSV(
  headers: string[],
  rows: (string | number | null)[][],
  filename: string
) {
  downloadCSV([headers, ...rows], filename)
}

// ─── Export button component HTML ─────────────────────────────
// Used inline — not a React component to avoid import cycles
export const exportBtnStyle = (mini = false) => ({
  display:         'flex',
  alignItems:      'center',
  gap:             mini ? 4 : 6,
  padding:         mini ? '4px 10px' : '6px 14px',
  borderRadius:    8,
  border:          '0.5px solid #d1d5db',
  background:      '#f9fafb',
  color:           '#374151',
  fontSize:        mini ? 11 : 12,
  fontWeight:      500,
  cursor:          'pointer',
  transition:      'background 0.15s',
})