// Exportación con identidad WELLcomm
// (1) Informe financiero mensual (Liquidación)  →  exportarPDFInforme / exportarExcelInforme
// (2) Presupuesto vs Real · Habitaciones        →  exportarPDFPresupuesto / exportarExcelPresupuesto

function fmtCOP(n) { return `COP ${Number(n || 0).toLocaleString('es-CO')}` }
function signo(v) { return v >= 0 ? fmtCOP(v) : `- ${fmtCOP(Math.abs(v))}` }
function fmtPctNum(v) { return `${Math.round((v || 0) * 100)}%` }

const MARCA = {
  negro: '#0d0d0d', sage: '#92DCB1', mint: '#08DBB0',
  off: '#FBFBFB', coral: '#E0654F', gold: '#C5A45E', muted: '#7a8c82',
}

function colorCump(pct) { return pct >= 95 ? '#27ae60' : pct >= 80 ? MARCA.gold : MARCA.coral }

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

// ===================== EXCEL — INFORME FINANCIERO (.xls) =====================
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

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Indicador</td><td ${th}>Valor</td></tr>
  <tr><td ${td}>Ocupación</td><td ${tdr}>${r.ocupacion || 0}%</td></tr>
  <tr><td ${td}>ADR</td><td ${tdr}>${fmtCOP(r.adr)}</td></tr>
  <tr><td ${td}>RevPAR</td><td ${tdr}>${fmtCOP(r.revpar)}</td></tr>
  <tr><td ${td}>Noches vendidas</td><td ${tdr}>${r.noches || 0}</td></tr></table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Cuenta de Resultados</td><td ${th}>Monto</td></tr>`
  pl.forEach(([label, val, tipo]) => {
    const bg = tipo === 'sub' ? `background:#f0f0f0;font-weight:bold;` : tipo === 'tot' ? `background:${MARCA.sage};font-weight:bold;` : ''
    h += `<tr><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;${bg}">${label}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${signo(val)}</td></tr>`
  })
  h += `</table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Ingresos por fuente</td><td ${th}>Monto</td></tr>
  <tr><td ${td}>Habitaciones (Cloudbeds)</td><td ${tdr}>${fmtCOP(ing.habitaciones)}</td></tr>
  <tr><td ${td}>Terraza / F&amp;B</td><td ${tdr}>${fmtCOP(ing.terraza)}</td></tr>
  <tr><td ${td}>SPA</td><td ${tdr}>${fmtCOP(ing.spa)}</td></tr>
  <tr><td ${td}>Upselling</td><td ${tdr}>${fmtCOP(ing.upselling)}</td></tr>
  <tr><td ${td}>Otros</td><td ${tdr}>${fmtCOP(ing.otrosIngresos)}</td></tr></table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Detalle de gastos</td><td ${th}>Monto</td></tr>`
  cats.forEach(cat => {
    const sub = (cat.lineas || []).reduce((a, l) => a + (Number(l.valor) || 0), 0)
    h += `<tr><td ${tsage}>${cat.emoji || ''} ${cat.label}</td><td style="background:${MARCA.sage};text-align:right;font-weight:bold;padding:6px 10px">${fmtCOP(sub)}</td></tr>`
    ;(cat.lineas || []).forEach(l => {
      h += `<tr><td ${td}>&nbsp;&nbsp;${l.label}</td><td ${tdr}>${fmtCOP(l.valor)}</td></tr>`
    })
  })
  h += `</table><br/>`

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

// ===================== PDF — INFORME FINANCIERO =====================
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

// ===================== EXCEL — PRESUPUESTO VS REAL (.xls) =====================
export function exportarExcelPresupuesto(pptoData, mes) {
  if (!pptoData || !pptoData.cumplimiento) { alert('No hay datos de presupuesto para exportar.'); return }
  const c = pptoData.cumplimiento
  const ocupPct = c.ppto.ocupacion > 0 ? Math.round((c.real.ocupacion / c.ppto.ocupacion) * 100) : 0
  const mesLabel = c.mes || mes

  const th = `style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold;text-align:left"`
  const td = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5"`
  const tdr = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right"`

  const filas = [
    ['Ventas alojamiento', fmtCOP(c.ppto.ventas), fmtCOP(c.real.ventas), c.cumplimientoVentas],
    ['Habitaciones-noche', (c.ppto.habVendidas || 0).toLocaleString('es-CO'), (c.real.habVendidas || 0).toLocaleString('es-CO'), c.cumplimientoHab],
    ['Tarifa media (ADR)', fmtCOP(c.ppto.tarifa), fmtCOP(c.real.tarifa), c.cumplimientoTarifa],
    ['Ocupación', fmtPctNum(c.ppto.ocupacion), fmtPctNum(c.real.ocupacion), ocupPct],
  ]

  let h = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">`

  h += `<table><tr><td style="font-size:20px;font-weight:bold;color:${MARCA.negro}">✳ WELLCOMM &nbsp;Spa &amp; Hotel</td></tr>
  <tr><td style="font-size:13px;color:${MARCA.muted}">Presupuesto vs Real · Habitaciones · ${mesLabel} 2026</td></tr>
  <tr><td style="font-size:11px;color:${MARCA.muted}">Where you are the luxury</td></tr></table><br/>`

  h += `<table><tr><td style="font-size:14px;font-weight:bold;color:${MARCA.negro}">Cumplimiento en ventas: ${c.cumplimientoVentas}%</td></tr>
  <tr><td style="font-size:11px;color:${MARCA.muted}">${c.difVentas >= 0 ? 'Sobre' : 'Bajo'} lo presupuestado: ${signo(c.difVentas)}</td></tr></table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Métrica</td><td ${th}>Presupuesto</td><td ${th}>Real</td><td ${th}>%</td></tr>`
  filas.forEach(([label, ppto, real, pct]) => {
    h += `<tr><td ${td}>${label}</td><td ${tdr}>${ppto}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:bold">${real}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:bold;color:${colorCump(pct)}">${pct}%</td></tr>`
  })
  h += `</table><br/>`

  if (pptoData.meses && pptoData.meses.length) {
    h += `<table border="0" cellspacing="0"><tr><td ${th}>Mes (presupuesto anual)</td><td ${th}>Ventas ppto</td><td ${th}>Ocupación ppto</td></tr>`
    pptoData.meses.forEach(m => {
      const bg = m.esMesActual ? `background:${MARCA.sage};font-weight:bold;` : ''
      h += `<tr><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;${bg}">${m.mes}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${fmtCOP(m.pptoVentas)}</td><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${fmtPctNum(m.pptoOcupacion)}</td></tr>`
    })
    h += `<tr><td style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold">TOTAL AÑO</td><td style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold;text-align:right">${fmtCOP(pptoData.totalPptoAnio)}</td><td style="background:${MARCA.negro};padding:6px 10px"></td></tr></table>`
  }

  h += `</body></html>`

  const blob = new Blob(['\ufeff', h], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `WELLcomm_PptoVsReal_${mes}.xls`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===================== PDF — PRESUPUESTO VS REAL =====================
export function exportarPDFPresupuesto(pptoData, mes) {
  if (!pptoData || !pptoData.cumplimiento) { alert('No hay datos de presupuesto para exportar.'); return }
  const w = window.open('', '_blank')
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return }

  const c = pptoData.cumplimiento
  const ocupPct = c.ppto.ocupacion > 0 ? Math.round((c.real.ocupacion / c.ppto.ocupacion) * 100) : 0
  const mesLabel = c.mes || mes

  const filas = [
    ['Ventas alojamiento', fmtCOP(c.ppto.ventas), fmtCOP(c.real.ventas), c.cumplimientoVentas],
    ['Habitaciones-noche', (c.ppto.habVendidas || 0).toLocaleString('es-CO'), (c.real.habVendidas || 0).toLocaleString('es-CO'), c.cumplimientoHab],
    ['Tarifa media (ADR)', fmtCOP(c.ppto.tarifa), fmtCOP(c.real.tarifa), c.cumplimientoTarifa],
    ['Ocupación', fmtPctNum(c.ppto.ocupacion), fmtPctNum(c.real.ocupacion), ocupPct],
  ]
  const filasHTML = filas.map(([label, ppto, real, pct]) =>
    `<tr><td>${label}</td><td class="ppto">${ppto}</td><td class="real">${real}</td><td class="pct" style="color:${colorCump(pct)}">${pct}%</td></tr>`
  ).join('')

  const anualHTML = (pptoData.meses || []).map(m =>
    `<tr${m.esMesActual ? ' class="hoy"' : ''}><td>${m.mes}</td><td style="text-align:right">${fmtCOP(m.pptoVentas)}</td><td style="text-align:right">${fmtPctNum(m.pptoOcupacion)}</td></tr>`
  ).join('')

  const anualBloque = (pptoData.meses && pptoData.meses.length) ? `
    <h2>Presupuesto anual 2026</h2>
    <table class="tbl">
      <tr class="head"><th>Mes</th><th style="text-align:right">Ventas ppto</th><th style="text-align:right">Ocupación</th></tr>
      ${anualHTML}
      <tr class="totA"><td>TOTAL AÑO</td><td style="text-align:right">${fmtCOP(pptoData.totalPptoAnio)}</td><td></td></tr>
    </table>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WELLcomm · Ppto vs Real ${mes}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: ${MARCA.negro}; margin: 0; }
    .head-bar { background: ${MARCA.negro}; color: #fff; padding: 22px 26px; display: flex; align-items: center; gap: 16px; }
    .head-bar .wm { font-size: 22px; font-weight: 800; letter-spacing: 4px; }
    .head-bar .sub { font-size: 11px; color: ${MARCA.sage}; letter-spacing: 1px; margin-top: 2px; }
    .head-bar .tag { font-size: 10px; color: #bbb; margin-top: 1px; font-style: italic; }
    .wrap { padding: 22px 26px; }
    .hero { background: ${MARCA.negro}; color: #fff; border-radius: 10px; padding: 18px 22px; margin-bottom: 6px; }
    .hero .lbl { font-size: 10px; color: ${MARCA.sage}; letter-spacing: 2px; }
    .hero .big { font-size: 40px; font-weight: 300; line-height: 1.1; color: ${colorCump(c.cumplimientoVentas)}; }
    .hero .dif { font-size: 12px; color: ${c.difVentas >= 0 ? MARCA.sage : MARCA.coral}; margin-top: 4px; }
    h2 { font-family: Georgia, serif; font-size: 14px; font-weight: 600; margin: 22px 0 8px; color: ${MARCA.negro}; border-bottom: 2px solid ${MARCA.sage}; padding-bottom: 4px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
    .tbl td, .tbl th { padding: 7px 8px; border-bottom: 1px solid #eee; }
    .tbl .head th { background: ${MARCA.negro}; color: #fff; text-align: left; }
    .tbl .head th:nth-child(2), .tbl .head th:nth-child(3), .tbl .head th:nth-child(4) { text-align: right; }
    .tbl td.ppto { text-align: right; color: ${MARCA.muted}; }
    .tbl td.real { text-align: right; font-weight: 700; }
    .tbl td.pct { text-align: right; font-weight: 800; }
    .tbl tr.hoy td { background: ${MARCA.sage}40; font-weight: 700; }
    .tbl tr.totA td { background: ${MARCA.negro}; color: #fff; font-weight: 800; }
    .footer { margin-top: 26px; border-top: 1px solid #e5e5e5; padding-top: 8px; font-size: 9px; color: ${MARCA.muted}; display: flex; justify-content: space-between; }
    .nota { font-size: 9px; color: ${MARCA.muted}; margin-top: 8px; font-style: italic; }
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
        <div class="sub">SPA &amp; HOTEL · PRESUPUESTO VS REAL · HABITACIONES · ${mesLabel.toUpperCase()} 2026</div>
        <div class="tag">Where you are the luxury</div>
      </div>
    </div>
    <div class="wrap">
      <div class="hero">
        <div class="lbl">CUMPLIMIENTO EN VENTAS</div>
        <div class="big">${c.cumplimientoVentas}%</div>
        <div class="dif">${c.difVentas >= 0 ? '▲' : '▼'} ${signo(c.difVentas)} ${c.difVentas >= 0 ? 'sobre' : 'bajo'} lo presupuestado</div>
      </div>

      <h2>Detalle del mes</h2>
      <table class="tbl">
        <tr class="head"><th>Métrica</th><th>Presupuesto</th><th>Real</th><th>%</th></tr>
        ${filasHTML}
      </table>
      <div class="nota">El "real" se calcula en vivo desde Cloudbeds, noche por noche, sobre las reservas válidas (check-in, check-out y confirmadas) del mes.</div>

      ${anualBloque}

      <div class="footer">
        <span>WELLcomm Spa &amp; Hotel · El Poblado, Medellín · Operación Wllmm SAS</span>
        <span>Generado ${new Date().toLocaleDateString('es-CO')}</span>
      </div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
  </body></html>`

  w.document.open(); w.document.write(html); w.document.close()
}
