// Exportación del informe financiero mensual con identidad WELLcomm
// PDF (vista imprimible de marca) y Excel (.xls con colores corporativos)

function fmtCOP(n) { return `COP ${Number(n || 0).toLocaleString('es-CO')}` }
function signo(v) { return v >= 0 ? fmtCOP(v) : `- ${fmtCOP(Math.abs(v))}` }

const MARCA = {
  negro: '#0d0d0d', sage: '#92DCB1', mint: '#08DBB0',
  off: '#FBFBFB', coral: '#E0654F', gold: '#C5A45E', muted: '#7a8c82',
}

function isotipo(color, size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="7"/>
    <g stroke="${color}" stroke-width="7">
      <line x1="50" y1="13" x2="50" y2="87"/>
      <line x1="13" y1="50" x2="87" y2="50"/>
      <line x1="24.5" y1="24.5" x2="75.5" y2="75.5"/>
      <line x1="75.5" y1="24.5" x2="24.5" y2="75.5"/>
    </g>
  </svg>`
}

// Filas de la cuenta de resultados (P&L), sin fee fijo
function filasPL(data) {
  const r = data.resumen || {}
  const ing = (data.gastos && data.gastos.ingresos) || {}
  const cats = data.categoriasResumen || []
  const rows = []
  rows.push(['Ingresos habitaciones', ing.habitaciones || 0, 'in'])
  rows.push(['Ingresos terraza (F&B)', ing.terraza || 0, 'in'])
  rows.push(['Ingresos SPA', ing.spa || 0, 'in'])
  rows.push(['Upselling y otros', (ing.upselling || 0) + (ing.otrosIngresos || 0), 'in'])
  rows.push(['TOTAL INGRESOS', r.totalIngresos || 0, 'sub'])
  cats.forEach(c => rows.push([`${c.emoji || ''} ${c.label}`.trim(), -(c.subtotal || 0), 'g']))
  if ((r.totalRecibos || 0) > 0) rows.push(['Recibos PDF', -(r.totalRecibos || 0), 'g'])
  rows.push(['GOP (Gross Operating Profit)', r.GOP || 0, 'sub'])
  rows.push(['Fee variable SOLARA (5% GOP)', -(r.feeSolaraVariable || 0), 'fee'])
  rows.push(['UTILIDAD NETA', r.utilidadNeta || 0, 'tot'])
  return rows
}

// ===================== EXCEL (.xls) =====================
export function exportarExcelInforme(data, mes) {
  if (!data) return
  const r = data.resumen || {}
  const ing = (data.gastos && data.gastos.ingresos) || {}
  const cats = (data.gastos && data.gastos.categorias) || []
  const recibos = data.recibos || []
  const pl = filasPL(data)

  const th = `style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold;text-align:left"`
  const tsage = `style="background:${MARCA.sage};color:${MARCA.negro};padding:6px 10px;font-weight:bold"`
  const td = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5"`
  const tdr = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right"`

  let h = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">`

  h += `<table><tr><td style="font-size:20px;font-weight:bold;color:${MARCA.negro}">✳ WELLCOMM &nbsp;Spa &amp; Hotel</td></tr>
  <tr><td style="font-size:13px;color:${MARCA.muted}">Informe Financiero · ${mes}</td></tr>
  <tr><td style="font-size:11px;color:${MARCA.muted}">Where you are the luxury</td></tr></table><br/>`

  // KPIs
  h += `<table border="0" cellspacing="0"><tr><td ${th}>Indicador</td><td ${th}>Valor</td></tr>
  <tr><td ${td}>Ocupación</td><td ${tdr}>${r.ocupacion || 0}%</td></tr>
  <tr><td ${td}>ADR</td><td ${tdr}>${fmtCOP(r.adr)}</td></tr>
  <tr><td ${td}>RevPAR</td><td ${tdr}>${fmtCOP(r.revpar)}</td></tr>
  <tr><td ${td}>Noches vendidas</td><td ${tdr}>${r.noches || 0}</td></tr></table><br/>`

  // P&L
  h += `<table border="0" cellspacing="0"><tr><td ${th}>Cuenta de Resultados</td><td ${th}>Monto</td></tr>`
  pl.forEach(([label, val, tipo]) => {
    const bg = tipo === 'sub' ? `background:#f0f0f0;font-weight:bold;` : tipo === 'tot' ? `background:${MARCA.sage};font-weight:bold;` : ''
    h += `<tr><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;${bg}">${label}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${signo(val)}</td></tr>`
  })
  h += `</table><br/>`

  // Ingresos por fuente
  h += `<table border="0" cellspacing="0"><tr><td ${th}>Ingresos por fuente</td><td ${th}>Monto</td></tr>
  <tr><td ${td}>Habitaciones (Cloudbeds)</td><td ${tdr}>${fmtCOP(ing.habitaciones)}</td></tr>
  <tr><td ${td}>Terraza / F&amp;B</td><td ${tdr}>${fmtCOP(ing.terraza)}</td></tr>
  <tr><td ${td}>SPA</td><td ${tdr}>${fmtCOP(ing.spa)}</td></tr>
  <tr><td ${td}>Upselling</td><td ${tdr}>${fmtCOP(ing.upselling)}</td></tr>
  <tr><td ${td}>Otros</td><td ${tdr}>${fmtCOP(ing.otrosIngresos)}</td></tr></table><br/>`

  // Detalle de gastos por categoría
  h += `<table border="0" cellspacing="0"><tr><td ${th}>Detalle de gastos</td><td ${th}>Monto</td></tr>`
  cats.forEach(cat => {
    const sub = (cat.lineas || []).reduce((a, l) => a + (Number(l.valor) || 0), 0)
    h += `<tr><td ${tsage}>${cat.emoji || ''} ${cat.label}</td><td style="background:${MARCA.sage};text-align:right;font-weight:bold;padding:6px 10px">${fmtCOP(sub)}</td></tr>`
    ;(cat.lineas || []).forEach(l => {
      h += `<tr><td ${td}>&nbsp;&nbsp;${l.label}</td><td ${tdr}>${fmtCOP(l.valor)}</td></tr>`
    })
  })
  h += `</table><br/>`

  // Recibos
  if (recibos.length) {
    h += `<table border="0" cellspacing="0"><tr><td ${th}>Recibos del mes</td><td ${th}>Fecha</td><td ${th}>Categoría</td><td ${th}>Monto</td></tr>`
    recibos.forEach(rc => {
      h += `<tr><td ${td}>${rc.proveedor || ''}</td><td ${td}>${rc.fecha || ''}</td><td ${td}>${rc.categoria || ''}</td><td ${tdr}>${fmtCOP(rc.importe)}</td></tr>`
    })
    h += `</table>`
  }

  h += `</body></html>`

  const blob = new Blob(['\ufeff', h], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `WELLcomm_Informe_${mes}.xls`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===================== PDF (vista imprimible de marca) =====================
export function exportarPDFInforme(data, mes) {
  if (!data) return
  const w = window.open('', '_blank')
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return }

  const r = data.resumen || {}
  const ing = (data.gastos && data.gastos.ingresos) || {}
  const cats = (data.gastos && data.gastos.categorias) || []
  const recibos = data.recibos || []
  const pl = filasPL(data)

  const plHTML = pl.map(([label, val, tipo]) => {
    if (tipo === 'sub') return `<tr class="sub"><td>${label}</td><td>${signo(val)}</td></tr>`
    if (tipo === 'tot') return `<tr class="tot"><td>${label}</td><td>${signo(val)}</td></tr>`
    if (tipo === 'fee') return `<tr class="fee"><td>${label}</td><td>${signo(val)}</td></tr>`
    if (tipo === 'g') return `<tr class="g"><td>${label}</td><td>${signo(val)}</td></tr>`
    return `<tr><td>${label}</td><td>${signo(val)}</td></tr>`
  }).join('')

  const gastosHTML = cats.map(cat => {
    const sub = (cat.lineas || []).reduce((a, l) => a + (Number(l.valor) || 0), 0)
    const lineas = (cat.lineas || []).map(l =>
      `<tr class="g"><td style="padding-left:18px">${l.label}</td><td>${fmtCOP(l.valor)}</td></tr>`
    ).join('')
    return `<tr class="cat"><td>${cat.emoji || ''} ${cat.label}</td><td>${fmtCOP(sub)}</td></tr>${lineas}`
  }).join('')

  const recibosHTML = recibos.length ? `
    <h2>Recibos del mes</h2>
    <table class="tbl">
      <tr class="head"><th>Proveedor</th><th>Fecha</th><th>Categoría</th><th style="text-align:right">Monto</th></tr>
      ${recibos.map(rc => `<tr><td>${rc.proveedor || ''}</td><td>${rc.fecha || ''}</td><td>${rc.categoria || ''}</td><td style="text-align:right">${fmtCOP(rc.importe)}</td></tr>`).join('')}
    </table>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WELLcomm · Informe ${mes}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: ${MARCA.negro}; margin: 0; }
    .head-bar { background: ${MARCA.negro}; color: #fff; padding: 22px 26px; display: flex; align-items: center; gap: 16px; }
    .head-bar .wm { font-size: 22px; font-weight: 800; letter-spacing: 4px; }
    .head-bar .sub { font-size: 11px; color: ${MARCA.sage}; letter-spacing: 1px; margin-top: 2px; }
    .head-bar .tag { font-size: 10px; color: #bbb; margin-top: 1px; font-style: italic; }
    .wrap { padding: 22px 26px; }
    h2 { font-family: Georgia, serif; font-size: 14px; font-weight: 600; margin: 22px 0 8px; color: ${MARCA.negro}; border-bottom: 2px solid ${MARCA.sage}; padding-bottom: 4px; }
    .kpis { display: flex; gap: 10px; margin-top: 6px; }
    .kpi { flex: 1; border: 1px solid #e5e5e5; border-top: 3px solid ${MARCA.sage}; border-radius: 8px; padding: 10px 12px; }
    .kpi .v { font-size: 18px; font-weight: 700; }
    .kpi .l { font-size: 9px; color: ${MARCA.muted}; text-transform: uppercase; letter-spacing: .5px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
    .tbl td, .tbl th { padding: 5px 8px; border-bottom: 1px solid #eee; }
    .tbl td:last-child, .tbl th:last-child { text-align: right; white-space: nowrap; }
    .tbl .head th { background: ${MARCA.negro}; color: #fff; text-align: left; }
    .pl td { font-size: 11px; }
    .pl .sub td { font-weight: 700; background: #f4f4f4; border-top: 1px solid #ccc; }
    .pl .tot td { font-weight: 800; font-size: 13px; background: ${MARCA.sage}; }
    .pl .g td { color: ${MARCA.muted}; }
    .pl .fee td { color: ${MARCA.gold}; }
    .pl .cat td { font-weight: 700; background: #fafafa; }
    .footer { margin-top: 26px; border-top: 1px solid #e5e5e5; padding-top: 8px; font-size: 9px; color: ${MARCA.muted}; display: flex; justify-content: space-between; }
    .noprint { text-align: center; padding: 14px; }
    .noprint button { background: ${MARCA.negro}; color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; cursor: pointer; }
    @media print { .noprint { display: none; } }
  </style></head>
  <body>
    <div class="noprint"><button onclick="window.print()">⬇ Guardar como PDF / Imprimir</button></div>
    <div class="head-bar">
      ${isotipo(MARCA.mint, 46)}
      <div>
        <div class="wm">WELLCOMM</div>
        <div class="sub">SPA &amp; HOTEL · INFORME FINANCIERO · ${mes}</div>
        <div class="tag">Where you are the luxury</div>
      </div>
    </div>
    <div class="wrap">
      <div class="kpis">
        <div class="kpi"><div class="v">${r.ocupacion || 0}%</div><div class="l">Ocupación</div></div>
        <div class="kpi"><div class="v">${fmtCOP(r.adr)}</div><div class="l">ADR</div></div>
        <div class="kpi"><div class="v">${fmtCOP(r.revpar)}</div><div class="l">RevPAR</div></div>
      </div>

      <h2>Cuenta de Resultados</h2>
      <table class="tbl pl">${plHTML}</table>

      <h2>Ingresos por fuente</h2>
      <table class="tbl">
        <tr><td>🏨 Habitaciones (Cloudbeds)</td><td>${fmtCOP(ing.habitaciones)}</td></tr>
        <tr><td>🍷 Terraza / F&amp;B</td><td>${fmtCOP(ing.terraza)}</td></tr>
        <tr><td>💆 SPA</td><td>${fmtCOP(ing.spa)}</td></tr>
        <tr><td>✨ Upselling</td><td>${fmtCOP(ing.upselling)}</td></tr>
        <tr><td>📦 Otros</td><td>${fmtCOP(ing.otrosIngresos)}</td></tr>
      </table>

      <h2>Detalle de gastos</h2>
      <table class="tbl pl">${gastosHTML}</table>

      ${recibosHTML}

      <div class="footer">
        <span>WELLcomm Spa &amp; Hotel · El Poblado, Medellín · Operación Wllmm SAS</span>
        <span>Generado ${new Date().toLocaleDateString('es-CO')}</span>
      </div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
  </body></html>`

  w.document.open(); w.document.write(html); w.document.close()
}
