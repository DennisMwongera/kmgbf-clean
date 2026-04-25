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

// ─── PDF builder ─────────────────────────────────────────────
export async function exportNationalPDF(
  national: NationalReport,
  radarCanvas: HTMLCanvasElement | null,
  barCanvas:   HTMLCanvasElement | null,
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
    doc.addPage()
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
    ['Institutions assessed', `${withData.length} of ${national.institutions.length}`],
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
  // PAGE 3 — RADAR CHART
  // ════════════════════════════════════════════════════════════
  if (radarCanvas) {
    addPage()
    doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
    doc.text('National Capacity Radar', ML, y)
    y += 6
    doc.setFontSize(8.5).setTextColor(100,130,110).setFont('helvetica','normal')
    doc.text(`Average across ${withData.length} institutions with assessment data`, ML, y)
    y += 8

    const imgData = radarCanvas.toDataURL('image/png')
    const maxW    = CW
    const maxH    = 130
    doc.addImage(imgData, 'PNG', ML, y, maxW, maxH)
    y += maxH + 10
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — INSTITUTION COMPARISON TABLE
  // ════════════════════════════════════════════════════════════
  addPage()
  doc.setFontSize(16).setTextColor(15,45,28).setFont('helvetica','bold')
  doc.text('Institution Comparison', ML, y)
  y += 10

  // Bar chart if available
  if (barCanvas) {
    const imgData = barCanvas.toDataURL('image/png')
    const bh = 60
    doc.addImage(imgData, 'PNG', ML, y, CW, bh)
    y += bh + 8
  }

  // Institution rows
  sectionHeader('Institution Scores by Dimension')

  // Header row
  const colW  = CW / (DIMENSIONS.length + 2)
  doc.setFontSize(6.5).setTextColor(80,80,80).setFont('helvetica','bold')
  doc.text('Institution', ML, y+3)
  doc.text('Overall', ML + CW - colW * DIMENSIONS.length - 22, y+3)
  DIMENSIONS.forEach((d, i) => {
    const abbr = d.replace(' Capacity','').replace(' and ','/')
      .split(' ').map(w => w[0]).join('').toUpperCase().slice(0,4)
    doc.text(abbr, ML + CW - colW * (DIMENSIONS.length - i) - 15, y+3, { align:'center' })
  })
  y += 6

  national.institutions.forEach(inst => {
    checkY(8)
    const bg = inst.overallScore !== null ? '#f0faf4' : '#fafafa'
    const [br,bg2,bb] = hex2rgb(bg)
    doc.setFillColor(br,bg2,bb)
    doc.rect(ML, y-1, CW, 6, 'F')

    doc.setFontSize(7).setTextColor(27,67,50).setFont('helvetica', inst.overallScore !== null ? 'bold' : 'normal')
    const name = inst.institution.name.length > 35 ? inst.institution.name.slice(0,33)+'…' : inst.institution.name
    doc.text(name, ML+1, y+3)

    if (inst.overallScore !== null) {
      doc.setFontSize(7).setTextColor(...hex2rgb(scoreColor(inst.overallScore))).setFont('helvetica','bold')
      doc.text(inst.overallScore.toFixed(2), ML + CW - colW * DIMENSIONS.length - 20, y+3)
      DIMENSIONS.forEach((d, i) => {
        const sv = inst.dimScores[d]
        doc.setFontSize(6.5).setTextColor(...hex2rgb(scoreColor(sv)))
        doc.text(sv !== null ? sv.toFixed(1) : '—', ML + CW - colW * (DIMENSIONS.length - i) - 15, y+3, { align:'center' })
      })
    } else {
      doc.setFontSize(7).setTextColor(160,160,160).setFont('helvetica','italic')
      doc.text('No assessment data', ML + CW - 50, y+3)
    }
    y += 7
  })

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
  // PAGE 6 — INSTITUTION DETAIL SCORES
  // ════════════════════════════════════════════════════════════
  withData.forEach(inst => {
    addPage()
    // Inst header
    doc.setFillColor(15,45,28)
    doc.rect(ML, y-5, CW, 14, 'F')
    doc.setFontSize(11).setTextColor(255,255,255).setFont('helvetica','bold')
    doc.text(inst.institution.name, ML+3, y+3)
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