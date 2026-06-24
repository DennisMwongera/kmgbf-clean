import type { NationalReport } from '@/lib/supabase/adminApi'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'

// ─── Colour helpers ───────────────────────────────────────────
function scoreColor(v: number | null): string {
  if (v === null) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
  if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'
  return '#047857'
}
function interpret(v: number | null): string {
  if (v === null) return 'Not assessed'
  if (v < 1) return 'Critical'; if (v < 2) return 'Very limited'
  if (v < 2.5) return 'Basic';  if (v < 3.5) return 'Moderate'
  if (v < 4.5) return 'Strong'; return 'Fully adequate'
}
function hex2rgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return [r, g, b]
}

// ─── Programmatic radar chart using jsPDF drawing primitives ──
function drawRadar(
  doc: any,
  cx: number, cy: number, radius: number,
  scores: Record<string, number | null>,
  dims: string[],
  maxVal = 5
) {
  const n     = dims.length
  const step  = (2 * Math.PI) / n
  const start = -Math.PI / 2  // start at top

  // Grid rings (5 levels) with score numbers
  for (let level = 1; level <= maxVal; level++) {
    const r = (radius * level) / maxVal
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(level === maxVal ? 0.4 : 0.2)
    const pts: [number,number][] = dims.map((_,i) => [
      cx + r * Math.cos(start + i * step),
      cy + r * Math.sin(start + i * step),
    ])
    pts.forEach(([x,y], i) => {
      const [nx,ny] = pts[(i+1) % pts.length]
      doc.line(x, y, nx, ny)
    })
    // Draw score number on the top axis (level label)
    const labelX = cx + r * Math.cos(start) + 0.5
    const labelY = cy + r * Math.sin(start) - 1
    // White backdrop pill
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(labelX - 2, labelY - 3, 6, 4, 0.8, 0.8, 'F')
    // Number
    doc.setFontSize(5).setTextColor(45, 106, 79).setFont('helvetica', 'bold')
    doc.text(String(level), labelX + 1, labelY, { align: 'center' })
  }

  // Axis lines + labels
  dims.forEach((dim, i) => {
    const angle = start + i * step
    const ex    = cx + radius * Math.cos(angle)
    const ey    = cy + radius * Math.sin(angle)
    doc.setDrawColor(200, 215, 205)
    doc.setLineWidth(0.2)
    doc.line(cx, cy, ex, ey)

    // Label — position slightly beyond the ring
    const lx = cx + (radius + 7) * Math.cos(angle)
    const ly = cy + (radius + 7) * Math.sin(angle)
    const short = dim.replace(' Capacity','').replace(' and ',' & ').replace('Knowledge and Information Management','KIM')
    doc.setFontSize(5.5).setTextColor(60,90,70).setFont('helvetica','normal')
    doc.text(short, lx, ly, { align:'center' })
  })

  // Score polygon fill
  const scorePts: [number,number][] = dims.map((dim, i) => {
    const v   = scores[dim]
    const val = (v !== null && v > 0) ? v : 0
    const r   = (radius * Math.min(val, maxVal)) / maxVal
    return [cx + r * Math.cos(start + i * step), cy + r * Math.sin(start + i * step)]
  })

  // Fill polygon
  doc.setFillColor(82, 183, 136)
  doc.setGState(doc.GState({ opacity: 0.25 }))
  scorePts.forEach(([x,y], i) => {
    const [nx,ny] = scorePts[(i+1) % scorePts.length]
    if (i === 0) doc.lines([[nx-x, ny-y]], x, y, [1, 1], 'F', true)
  })
  // Proper filled polygon via moveTo / lineTo
  const pathStr = scorePts.map(([x,y], i) => `${i===0?'M':'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z'
  try {
    doc.setFillColor(82, 183, 136)
    doc.setGState(doc.GState({ opacity: 0.2 }))
    ;(doc as any).path(pathStr, 'F')
  } catch {}

  // Outline stroke
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.6)
  doc.setGState(doc.GState({ opacity: 1 }))
  scorePts.forEach(([x,y], i) => {
    const [nx,ny] = scorePts[(i+1) % scorePts.length]
    doc.line(x, y, nx, ny)
  })

  // Score dots
  scorePts.forEach(([x,y]) => {
    doc.setFillColor(45, 106, 79)
    doc.circle(x, y, 1, 'F')
  })
}

// ─── PDF builder ─────────────────────────────────────────────
export async function exportNationalPDF(
  national: NationalReport,
  radarCanvas: HTMLCanvasElement | null,
  barCanvas:   HTMLCanvasElement | null,
  totalInstitutions?: number,  // total before any filter was applied
) {
  const { jsPDF } = await import('jspdf')

  const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W     = 210
  const H     = 297
  const ML    = 15   // margin left
  const MR    = 15   // margin right
  const CW    = W - ML - MR  // content width
  const date  = new Date(national.generatedAt).toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })
  const withData = national.institutions.filter(r => r.overallScore !== null)

  // ─── Helpers ────────────────────────────────────────────────
  let y = 0

  function addPage() {
    doc.addPage([210, 297]) // always portrait A4
    y = 20
    // Page footer
    const pg = doc.getNumberOfPages()
    doc.setFontSize(8).setTextColor(160,160,160)
    doc.text(`KMGBF National Capacity Assessment Report  ·  Page ${pg}`, W/2, H-8, { align:'center' })
  }

  function checkY(needed: number) {
    if (y + needed > H - 20) addPage()
  }

  function sectionHeader(title: string, color = '#1b4332') {
    checkY(12)
    const [r,g,b] = hex2rgb(color)
    doc.setFillColor(r,g,b)
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F')
    doc.setFontSize(9).setTextColor(255,255,255)
    doc.setFont('helvetica','bold')
    doc.text(title.toUpperCase(), ML+3, y+5.5)
    doc.setTextColor(0,0,0)
    y += 11
  }

  function scoreChip(v: number | null, x: number, yy: number, w = 20) {
    const col   = scoreColor(v)
    const [r,g,b] = hex2rgb(col)
    doc.setFillColor(r,g,b)
    doc.roundedRect(x, yy-3, w, 5, 1, 1, 'F')
    doc.setFontSize(7).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(v !== null ? v.toFixed(2) : '—', x + w/2, yy+0.5, { align:'center' })
    doc.setTextColor(0,0,0).setFont('helvetica','normal')
  }

  function progressBar(v: number | null, x: number, yy: number, w: number) {
    // Background
    doc.setFillColor(232,227,218)
    doc.roundedRect(x, yy-2, w, 4, 1, 1, 'F')
    if (v !== null && v > 0) {
      const col = scoreColor(v)
      const [r,g,b] = hex2rgb(col)
      doc.setFillColor(r,g,b)
      doc.roundedRect(x, yy-2, Math.max(2, (v/5)*w), 4, 1, 1, 'F')
    }
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════
  y = 50
  doc.setFillColor(15,45,28)
  doc.rect(0, 0, W, 80, 'F')

  doc.setFontSize(9).setTextColor(149,213,178).setFont('helvetica','bold')
  doc.text('CONVENTION ON BIOLOGICAL DIVERSITY  ·  KMGBF 2030', W/2, 25, { align:'center' })

  doc.setFontSize(22).setTextColor(255,255,255).setFont('helvetica','bold')
  doc.text('National Capacity', W/2, 42, { align:'center' })
  doc.text('Assessment Report', W/2, 52, { align:'center' })

  doc.setFontSize(10).setTextColor(149,213,178).setFont('helvetica','normal')
  doc.text('Kunming-Montreal Global Biodiversity Framework', W/2, 66, { align:'center' })

  y = 95
  // National score card
  doc.setFillColor(240,250,244)
  doc.roundedRect(ML, y, CW, 35, 3, 3, 'F')
  doc.setDrawColor(82,183,136); doc.setLineWidth(0.5)
  doc.roundedRect(ML, y, CW, 35, 3, 3, 'S')

  const ns = national.nationalOverall
  doc.setFontSize(11).setTextColor(27,67,50).setFont('helvetica','bold')
  doc.text('Overall National Readiness Score', ML+8, y+9)

  doc.setFontSize(28).setTextColor(...hex2rgb(scoreColor(ns))).setFont('helvetica','bold')
  doc.text(ns !== null ? ns.toFixed(2) : '—', ML+8, y+26)
  doc.setFontSize(10).setTextColor(100,130,110).setFont('helvetica','normal')
  doc.text('out of 5.00', ML+8, y+31)

  doc.setFontSize(9).setTextColor(27,67,50).setFont('helvetica','bold')
  doc.text(interpret(ns), ML+60, y+26)

  // Meta info
  y += 42
  const meta = [
    ['Report generated',   date],
    ['Institutions assessed', totalInstitutions && totalInstitutions > national.institutions.length
      ? `${withData.length} of ${national.institutions.length} (filtered from ${totalInstitutions})`
      : `${withData.length} of ${national.institutions.length}`
    ],
    ['Targets covered',    '23 KMGBF 2030 Targets'],
    ['Dimensions assessed','8 Capacity Dimensions'],
  ]
  meta.forEach(([label, val]) => {
    doc.setFontSize(9).setTextColor(100,130,110).setFont('helvetica','normal')
    doc.text(label + ':', ML, y+4)
    doc.setTextColor(27,67,50).setFont('helvetica','bold')
    doc.text(val, ML+55, y+4)
    y += 7
  })

  // Filter notice — shown only when report is a subset
  if (totalInstitutions && totalInstitutions > national.institutions.length) {
    checkY(20)
    doc.setFillColor(254,243,199)  // amber-100
    doc.roundedRect(ML, y, CW, 14, 2, 2, 'F')
    doc.setDrawColor(252,211,77)   // amber-300
    doc.setLineWidth(0.5)
    doc.roundedRect(ML, y, CW, 14, 2, 2, 'S')
    doc.setFontSize(8.5).setTextColor(146,64,14).setFont('helvetica','bold')
    doc.text('⚠  FILTERED REPORT', ML+4, y+5.5)
    doc.setFont('helvetica','normal')
    doc.text(
      `This report covers ${national.institutions.length} of ${totalInstitutions} institutions. It does not represent the full national picture.`,
      ML+4, y+10.5
    )
    y += 18
  }

  // Footer on cover
  y = H - 15
  doc.setFontSize(8).setTextColor(160,160,160).setFont('helvetica','normal')
  doc.text('KMGBF National Capacity Assessment Tool  ·  Page 1', W/2, y, { align:'center' })

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — NATIONAL AVERAGE BY DIMENSION
  // ════════════════════════════════════════════════════════════
  addPage()
  doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
  doc.text('National Average — Capacity by Dimension', ML, y)
  y += 10

  DIMENSIONS.forEach(dim => {
    checkY(12)
    const v = national.nationalDimScores[dim]

    // Dimension name
    doc.setFontSize(8.5).setTextColor(27,67,50).setFont('helvetica','normal')
    doc.text(dim, ML, y)

    // Progress bar
    progressBar(v, ML, y+4, CW - 45)

    // Score chip
    scoreChip(v, ML + CW - 42, y+2, 20)

    // Interpretation
    doc.setFontSize(7).setTextColor(...hex2rgb(scoreColor(v))).setFont('helvetica','bold')
    doc.text(interpret(v), ML + CW - 20, y+4, { align:'left' })

    y += 12
  })

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — NATIONAL CAPACITY RADAR
  // ════════════════════════════════════════════════════════════
  addPage()
  doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
  doc.text('National Capacity Radar', ML, y)
  y += 6
  doc.setFontSize(8.5).setTextColor(100,130,110).setFont('helvetica','normal')
  doc.text(`Average across ${withData.length} institutions with assessment data`, ML, y)
  y += 10

  if (radarCanvas) {
    // Use the canvas image if available
    const imgData = radarCanvas.toDataURL('image/png')
    const sz = 120
    doc.addImage(imgData, 'PNG', ML + (CW-sz)/2, y, sz, sz)
    y += sz + 8
  } else {
    // Draw radar programmatically
    const cx = ML + CW/2
    const cy = y + 65
    drawRadar(doc, cx, cy, 50, national.nationalDimScores, DIMENSIONS)
    y += 140
  }

  // National dimension scores table below radar
  sectionHeader('National Average — Dimension Scores')
  DIMENSIONS.forEach((dim, i) => {
    checkY(8)
    const v   = national.nationalDimScores[dim]
    const bg  = i % 2 === 0 ? '#f6f3ee' : '#ffffff'
    const [br,bg2,bb] = hex2rgb(bg)
    doc.setFillColor(br,bg2,bb)
    doc.rect(ML, y, CW, 7, 'F')
    doc.setFontSize(8).setTextColor(27,67,50).setFont('helvetica','normal')
    doc.text(dim, ML+2, y+5)
    const barX = ML+90; const barW = CW-90-30; const barH = 3
    doc.setFillColor(232,227,218)
    doc.roundedRect(barX, y+2, barW, barH, 0.8, 0.8, 'F')
    if (v !== null && v > 0) {
      const [fr,fg,fb] = hex2rgb(scoreColor(v))
      doc.setFillColor(fr,fg,fb)
      doc.roundedRect(barX, y+2, Math.max(2,(v/5)*barW), barH, 0.8, 0.8, 'F')
    }
    doc.setFontSize(8).setTextColor(...hex2rgb(scoreColor(v))).setFont('helvetica','bold')
    doc.text(v !== null ? v.toFixed(2) : '—', ML+CW-2, y+5, { align:'right' })
    y += 7
  })

  // ════════════════════════════════════════════════════════════
  // PAGE 3b — PER-INSTITUTION RADAR CHARTS (4 per page)
  // ════════════════════════════════════════════════════════════
  const RADARS_PER_PAGE = 4
  const radarW = (CW - 10) / 2   // 2 columns
  const radarH = 80
  const radarPad = 5

  withData.forEach((inst, idx) => {
    const posOnPage = idx % RADARS_PER_PAGE

    if (posOnPage === 0) {
      addPage()
      doc.setFontSize(14).setTextColor(15,45,28).setFont('helvetica','bold')
      doc.text('Institution Capacity Radars', ML, y)
      y += 8
    }

    const col    = posOnPage % 2          // 0 = left, 1 = right
    const row    = Math.floor(posOnPage / 2)  // 0 = top, 1 = bottom
    const baseX  = ML + col * (radarW + radarPad)
    const baseY  = y + row * (radarH + 10)

    // Institution card background
    doc.setFillColor(246,243,238)
    doc.roundedRect(baseX, baseY, radarW, radarH, 2, 2, 'F')
    doc.setDrawColor(216,243,220)
    doc.setLineWidth(0.3)
    doc.roundedRect(baseX, baseY, radarW, radarH, 2, 2, 'S')

    // Institution name — wrapped
    doc.setFontSize(6.5).setTextColor(27,67,50).setFont('helvetica','bold')
    const nameLines = doc.splitTextToSize(inst.institution.name, radarW - 4)
    const maxNameLines = 2
    const displayLines = nameLines.slice(0, maxNameLines)
    if (nameLines.length > maxNameLines) displayLines[maxNameLines-1] = displayLines[maxNameLines-1].replace(/\s\S+$/, '…')
    displayLines.forEach((line: string, li: number) => {
      doc.text(line, baseX + radarW/2, baseY + 5 + li * 4, { align:'center' })
    })

    // Overall score chip
    const ov = inst.overallScore
    doc.setFontSize(8).setTextColor(...hex2rgb(scoreColor(ov))).setFont('helvetica','bold')
    doc.text(ov !== null ? ov.toFixed(2) : '—', baseX + radarW - 3, baseY + 5, { align:'right' })

    // Draw radar
    const rcx = baseX + radarW / 2
    const rcy = baseY + displayLines.length * 4 + 10 + 26
    drawRadar(doc, rcx, rcy, 22, inst.dimScores, DIMENSIONS)

    // If last on page, reset y for next group header
    if (posOnPage === RADARS_PER_PAGE - 1 || idx === withData.length - 1) {
      if (posOnPage < 2) {
        y += radarH + 14  // only one row used
      } else {
        y += (radarH + 10) * 2 + 4  // two rows used
      }
    }
  })

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — INSTITUTION COMPARISON TABLE (LANDSCAPE)
  // ════════════════════════════════════════════════════════════
  doc.addPage('a4', 'landscape')
  const LW   = 297  // landscape width
  const LH   = 210  // landscape height
  const LML  = 15
  const LMR  = 15
  const LCW  = LW - LML - LMR
  y = 20

  // Page footer
  doc.setFontSize(8).setTextColor(160,160,160)
  doc.text(`KMGBF National Capacity Assessment Report  ·  Page ${doc.getNumberOfPages()}`, LW/2, LH-8, { align:'center' })

  doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
  doc.text('Institution Comparison', LML, y)
  y += 8

  // Bar chart if available
  if (barCanvas) {
    const imgData = barCanvas.toDataURL('image/png')
    const bh = 50
    doc.addImage(imgData, 'PNG', LML, y, LCW, bh)
    y += bh + 6
  }

  // Section header
  doc.setFillColor(27,67,50)
  doc.roundedRect(LML, y, LCW, 8, 1, 1, 'F')
  doc.setFontSize(9).setTextColor(255,255,255).setFont('helvetica','bold')
  doc.text('INSTITUTION SCORES BY DIMENSION', LML+3, y+5.5)
  y += 11

  // Column layout — wider institution name col + overall + 8 dim cols
  const instColW = 90
  const overallW = 18
  const dimColW  = (LCW - instColW - overallW) / DIMENSIONS.length

  // Rotated dimension headers
  const headerRowH = 36
  doc.setFontSize(7).setTextColor(80,80,80).setFont('helvetica','bold')
  doc.text('Institution', LML+2, y + headerRowH - 4)
  doc.text('Overall', LML + instColW + overallW/2, y + headerRowH - 4, { align:'center' })

  DIMENSIONS.forEach((d, i) => {
    const cx = LML + instColW + overallW + dimColW * i + dimColW/2
    const shortName = d.replace(' Capacity', '').replace(' and ', ' & ')
    doc.setFontSize(6.5).setTextColor(60,90,70).setFont('helvetica','bold')
    doc.text(shortName, cx, y + headerRowH - 2, { angle: 60, align: 'left' })
  })
  y += headerRowH

  // Institution rows — with text wrapping for long names
  national.institutions.forEach((inst, rowIdx) => {
    // Pre-calculate wrapped lines for institution name
    doc.setFontSize(7).setFont('helvetica', inst.overallScore !== null ? 'bold' : 'normal')
    const wrappedName = doc.splitTextToSize(inst.institution.name, instColW - 4)
    const lineH   = 5
    const rowH    = Math.max(9, wrappedName.length * lineH + 3)

    if (y + rowH > LH - 25) {
      doc.addPage('a4', 'landscape')
      y = 20
      doc.setFontSize(8).setTextColor(160,160,160)
      doc.text(`KMGBF National Capacity Assessment Report  ·  Page ${doc.getNumberOfPages()}`, LW/2, LH-8, { align:'center' })
    }

    const bg = rowIdx % 2 === 0 ? '#f6f3ee' : '#ffffff'
    const [br,bg2,bb] = hex2rgb(bg)
    doc.setFillColor(br,bg2,bb)
    doc.rect(LML, y, LCW, rowH, 'F')

    // Draw thin bottom border
    doc.setDrawColor(220,220,220)
    doc.setLineWidth(0.1)
    doc.line(LML, y + rowH, LML + LCW, y + rowH)

    // Institution name — wrapped, vertically centred
    doc.setFontSize(7).setTextColor(27,67,50).setFont('helvetica', inst.overallScore !== null ? 'bold' : 'normal')
    const textStartY = y + (rowH - wrappedName.length * lineH) / 2 + lineH - 0.5
    wrappedName.forEach((line: string, li: number) => {
      doc.text(line, LML+2, textStartY + li * lineH)
    })

    const midY = y + rowH / 2 + 2

    if (inst.overallScore !== null) {
      doc.setFontSize(7.5).setTextColor(...hex2rgb(scoreColor(inst.overallScore))).setFont('helvetica','bold')
      doc.text(inst.overallScore.toFixed(2), LML + instColW + overallW/2, midY, { align:'center' })

      DIMENSIONS.forEach((d, i) => {
        const sv = inst.dimScores[d]
        const cx = LML + instColW + overallW + dimColW * i + dimColW/2
        doc.setFontSize(7).setTextColor(...hex2rgb(scoreColor(sv))).setFont('helvetica','bold')
        doc.text(sv !== null ? sv.toFixed(1) : '—', cx, midY, { align:'center' })
      })
    } else {
      doc.setFontSize(7).setTextColor(160,160,160).setFont('helvetica','italic')
      doc.text('No assessment data', LML + instColW + 5, midY)
    }
    y += rowH
  })

  // Switch back to portrait for remaining pages
  // Use [width,height] to explicitly set portrait A4 dimensions
  doc.addPage([210, 297])
  y = 20
  doc.setFontSize(8).setTextColor(160,160,160)
  doc.text(`KMGBF National Capacity Assessment Report  ·  Page ${doc.getNumberOfPages()}`, W/2, H-8, { align:'center' })

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — TARGET READINESS
  // ════════════════════════════════════════════════════════════
  addPage()
  doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
  doc.text('KMGBF Target Readiness — National Overview', ML, y)
  y += 10

  sectionHeader('All 23 KMGBF 2030 Targets')

  KMGBF_TARGETS.forEach(t => {
    checkY(10)
    const v   = national.nationalTargets[t.num]
    const col = scoreColor(v)

    // Target number badge
    const [tr,tg,tb] = hex2rgb(col)
    doc.setFillColor(tr,tg,tb)
    doc.circle(ML+3, y+2, 3, 'F')
    doc.setFontSize(6).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(String(t.num), ML+3, y+3, { align:'center' })

    // Target title
    doc.setFontSize(8).setTextColor(27,67,50).setFont('helvetica','normal')
    const title = t.title.length > 45 ? t.title.slice(0,43)+'…' : t.title
    doc.text(title, ML+8, y+3)

    // Progress bar
    progressBar(v, ML+8, y+6.5, CW - 45)

    // Score
    doc.setFontSize(7.5).setTextColor(...hex2rgb(col)).setFont('helvetica','bold')
    doc.text(v !== null ? v.toFixed(2) : '—', ML + CW - 35, y+3)

    // Interpretation
    doc.setFontSize(6.5).setTextColor(100,130,110).setFont('helvetica','normal')
    doc.text(interpret(v), ML + CW - 30, y+7)

    y += 11
  })

  // ════════════════════════════════════════════════════════════
  // PAGE 5b — DIMENSION SCORES BY INSTITUTION (one page per dim)
  // ════════════════════════════════════════════════════════════
  DIMENSIONS.forEach((dim, dimIdx) => {
    addPage()

    // Page title
    doc.setFontSize(14).setTextColor(15,45,28).setFont('helvetica','bold')
    doc.text('Dimension Scores by Institution', ML, y)
    y += 7

    // Dimension header band — full width, prominent
    doc.setFillColor(27,67,50)
    doc.roundedRect(ML, y, CW, 12, 2, 2, 'F')
    doc.setFontSize(11).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(dim, ML+4, y+8)
    // Dimension number badge
    doc.setFillColor(82,183,136)
    doc.roundedRect(ML+CW-18, y+2, 14, 8, 1, 1, 'F')
    doc.setFontSize(8).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(`${dimIdx+1}/8`, ML+CW-11, y+7.5, { align:'center' })
    y += 15

    // National average row
    const natAvg = national.nationalDimScores[dim]
    doc.setFillColor(216,243,220)
    doc.roundedRect(ML, y, CW, 9, 1, 1, 'F')
    doc.setFontSize(8).setTextColor(27,67,50).setFont('helvetica','bold')
    doc.text('National Average', ML+3, y+6)
    // National avg bar
    const navBarX = ML + 80
    const navBarW = CW - 80 - 25
    doc.setFillColor(200,230,210)
    doc.roundedRect(navBarX, y+2.5, navBarW, 4, 1, 1, 'F')
    if (natAvg !== null && natAvg > 0) {
      const [fr,fg,fb] = hex2rgb(scoreColor(natAvg))
      doc.setFillColor(fr,fg,fb)
      doc.roundedRect(navBarX, y+2.5, Math.max(2,(natAvg/5)*navBarW), 4, 1, 1, 'F')
    }
    doc.setFontSize(8).setTextColor(...hex2rgb(scoreColor(natAvg))).setFont('helvetica','bold')
    doc.text(natAvg !== null ? natAvg.toFixed(2) : '—', ML+CW-3, y+6, { align:'right' })
    y += 12

    // Column headers
    doc.setFontSize(6.5).setTextColor(100,130,110).setFont('helvetica','bold')
    doc.text('Institution', ML+2, y+4)
    doc.text('Score', ML+CW-3, y+4, { align:'right' })
    doc.setDrawColor(200,220,210)
    doc.setLineWidth(0.3)
    doc.line(ML, y+6, ML+CW, y+6)
    y += 8

    // Each institution — generous row height, full name
    withData.forEach((inst, rowIdx) => {
      // Pre-calculate wrapped name
      doc.setFontSize(7.5).setFont('helvetica','bold')
      const nameLines = doc.splitTextToSize(inst.institution.name, 72)
      const rowH = Math.max(13, nameLines.length * 5.5 + 5)

      const bg = rowIdx % 2 === 0 ? '#f6f3ee' : '#ffffff'
      const [br,bg2,bb] = hex2rgb(bg)
      doc.setFillColor(br,bg2,bb)
      doc.rect(ML, y, CW, rowH, 'F')

      // Left accent stripe — colour coded by score
      const v = inst.dimScores[dim]
      const [ar,ag,ab] = hex2rgb(scoreColor(v))
      doc.setFillColor(ar,ag,ab)
      doc.rect(ML, y, 2, rowH, 'F')

      // Institution name — full, wrapped
      doc.setFontSize(7.5).setTextColor(27,67,50).setFont('helvetica','bold')
      const nameStartY = y + (rowH - nameLines.length * 5.5) / 2 + 5
      nameLines.forEach((line: string, li: number) => {
        doc.text(line, ML+5, nameStartY + li * 5.5)
      })

      // Institution type — subtitle
      if (inst.institution.type) {
        doc.setFontSize(6).setTextColor(120,150,130).setFont('helvetica','normal')
        doc.text(inst.institution.type, ML+5, nameStartY + nameLines.length * 5.5)
      }

      const midY = y + rowH / 2 + 1.5

      // Progress bar
      const barX = ML + 77
      const barW = CW - 77 - 28
      const barH = 5
      const barY = midY - barH / 2

      // Bar track
      doc.setFillColor(232,227,218)
      doc.roundedRect(barX, barY, barW, barH, 1.5, 1.5, 'F')

      // Bar fill with gradient-like effect
      if (v !== null && v > 0) {
        const fillW = Math.max(3, (v / 5) * barW)
        const [fr,fg,fb] = hex2rgb(scoreColor(v))
        doc.setFillColor(fr,fg,fb)
        doc.roundedRect(barX, barY, fillW, barH, 1.5, 1.5, 'F')
        // Score label inside bar if wide enough
        if (fillW > 12) {
          doc.setFontSize(6).setTextColor(255,255,255).setFont('helvetica','bold')
          doc.text(v.toFixed(1), barX + fillW - 2, midY + 0.8, { align:'right' })
        }
      }

      // Numeric score — right side
      doc.setFontSize(9).setTextColor(...hex2rgb(scoreColor(v))).setFont('helvetica','bold')
      doc.text(v !== null ? v.toFixed(2) : '—', ML+CW-12, midY + 1, { align:'right' })

      // Interpretation label
      doc.setFontSize(6).setTextColor(120,150,130).setFont('helvetica','normal')
      doc.text(interpret(v), ML+CW-1, midY + 5.5, { align:'right' })

      // Bottom separator
      doc.setDrawColor(220,215,205)
      doc.setLineWidth(0.2)
      doc.line(ML, y+rowH, ML+CW, y+rowH)

      y += rowH
    })

    // Score legend at bottom of each page
    const legendY = H - 30
    doc.setFontSize(6.5).setTextColor(100,130,110).setFont('helvetica','bold')
    doc.text('Score guide:', ML, legendY)
    const legend = [
      { label:'0–1 Critical', color:'#dc2626' },
      { label:'1–2 Very Limited', color:'#ea580c' },
      { label:'2–3 Basic', color:'#ca8a04' },
      { label:'3–4 Moderate', color:'#16a34a' },
      { label:'4–5 Strong', color:'#047857' },
    ]
    let lx = ML + 22
    legend.forEach(({ label, color }) => {
      const [cr,cg,cb] = hex2rgb(color)
      doc.setFillColor(cr,cg,cb)
      doc.rect(lx, legendY-3, 3, 3, 'F')
      doc.setFontSize(6).setTextColor(80,80,80).setFont('helvetica','normal')
      doc.text(label, lx+4, legendY)
      lx += 32
    })
  })

  // ════════════════════════════════════════════════════════════
  // PAGE 6 — INSTITUTION DETAIL SCORES
  // ════════════════════════════════════════════════════════════
  withData.forEach(inst => {
    addPage()
    // Inst header
    doc.setFillColor(15,45,28)
    doc.rect(ML, y-5, CW, 14, 'F')
    doc.setFontSize(11).setTextColor(255,255,255).setFont('helvetica','bold')
    // Wrap long institution names in the header
    const instLines = doc.splitTextToSize(inst.institution.name, CW - 6)
    instLines.forEach((line: string, li: number) => {
      doc.text(line, ML+3, y+3 + li*5)
    })
    if (instLines.length > 1) {
      // Extend header rect for wrapped name
      doc.setFillColor(15,45,28)
      doc.rect(ML, y-5, CW, 14 + (instLines.length-1)*5, 'F')
      doc.setFontSize(11).setTextColor(255,255,255).setFont('helvetica','bold')
      instLines.forEach((line: string, li: number) => {
        doc.text(line, ML+3, y+3 + li*5)
      })
    }
    doc.setFontSize(8).setTextColor(149,213,178).setFont('helvetica','normal')
    const meta = [inst.institution.type, inst.institution.level].filter(Boolean).join(' · ')
    doc.text(meta || '', ML+3, y+8)
    doc.setFontSize(9).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(inst.overallScore !== null ? inst.overallScore.toFixed(2) : '—', ML+CW-3, y+3, { align:'right' })
    y += 14

    // Dimension scores
    doc.setFontSize(9).setTextColor(27,67,50).setFont('helvetica','bold')
    doc.text('Capacity by Dimension', ML, y+4); y += 8

    DIMENSIONS.forEach(dim => {
      checkY(10)
      const v = inst.dimScores[dim]
      doc.setFontSize(7.5).setTextColor(27,67,50).setFont('helvetica','normal')
      doc.text(dim, ML, y)
      progressBar(v, ML, y+3, CW - 40)
      doc.setFontSize(7).setTextColor(...hex2rgb(scoreColor(v))).setFont('helvetica','bold')
      doc.text(v !== null ? v.toFixed(2) : '—', ML + CW - 38, y+3)
      doc.setFontSize(6.5).setTextColor(100,130,110).setFont('helvetica','normal')
      doc.text(interpret(v), ML + CW - 30, y+3)
      y += 9
    })

    y += 4
    doc.setFontSize(9).setTextColor(27,67,50).setFont('helvetica','bold')
    doc.text('Target Scores', ML, y+4); y += 8

    // Targets in 2-column grid
    const tList = KMGBF_TARGETS
    const half  = Math.ceil(tList.length / 2)
    const col2  = ML + CW/2 + 3

    tList.forEach((t, idx) => {
      const isRight = idx >= half
      const xi      = isRight ? col2 : ML
      const ti      = isRight ? idx - half : idx
      const yy      = y + ti * 8
      checkY(8)

      const v   = inst.targetScores[t.num]
      const col = scoreColor(v)
      doc.setFontSize(6.5).setTextColor(100,130,110).setFont('helvetica','bold')
      doc.text(`T${t.num}`, xi, yy+3)
      doc.setTextColor(27,67,50).setFont('helvetica','normal')
      const short = t.title.length > 22 ? t.title.slice(0,20)+'…' : t.title
      doc.text(short, xi+7, yy+3)
      doc.setTextColor(...hex2rgb(col)).setFont('helvetica','bold')
      doc.text(v !== null ? v.toFixed(1) : '—', xi + CW/2 - 5, yy+3, { align:'right' })
    })
    y += half * 8 + 4
  })

  // ─── Save ─────────────────────────────────────────────────
  const filename = `KMGBF_National_Report_${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(filename)
}