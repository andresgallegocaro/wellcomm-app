// Exportación con identidad WELLcomm
// (1) Liquidación · P&L Oficial USALI (Owner Portal)  →  exportarPDFInforme / exportarExcelInforme
// (2) Presupuesto vs Real · Habitaciones (Revenue)    →  exportarPDFPresupuesto / exportarExcelPresupuesto

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

// Filas de la cuenta de resultados USALI (estructura oficial del board).
// Devuelve [label, ppto, real, tipo, resta]
//   tipo: 'header' | 'in' | 'g' | 'sub' | 'gop' | 'fee' | 'final'
//   real = null  -> mes sin cierre (se muestra "—")
//   resta = true -> el monto se presenta en negativo
function filasUSALI(data) {
  const p = data.pnl
  const cierre = !!data.tieneCierre
  if (!p) return []
  const R = (node) => cierre ? (node && node.real != null ? node.real : 0) : null
  const P = (node) => (node && node.ppto != null ? node.ppto : 0)
  const rows = []
  const add = (label, node, tipo, resta = false) => rows.push([label, P(node), R(node), tipo, resta])
  const head = (label) => rows.push([label, null, null, 'header', false])

  head('INGRESOS OPERATIVOS')
  add('Habitaciones', p.ingresos.habitaciones, 'in')
  add('A&B · The Terrace', p.ingresos.ab, 'in')
  add('AKEN Spa', p.ingresos.spa, 'in')
  add('Otros (Minibar)', p.ingresos.otros, 'in')
  add('Ingreso total', p.ingresos.total, 'sub')

  head('UTILIDAD DEPARTAMENTAL')
  add('Habitaciones', p.utilidad.habitaciones, 'in')
  add('A&B · The Terrace', p.utilidad.ab, 'in')
  add('AKEN Spa', p.utilidad.spa, 'in')
  add('Otros departamentos', p.utilidad.otros, 'in')
  add('Arrendamientos y recobros', p.utilidad.arrendamientos, 'in')
  add('Utilidad departamental', p.utilidad.departamental, 'sub')

  head('GASTOS NO DISTRIBUIDOS')
  add('Administración y generales', p.noDistribuidos.admon, 'g', true)
  if (p.feeSolara && p.feeSolara.aplicado)
    rows.push(['↳ Asesoría · Fee gestión SOLARA', p.feeSolara.total, null, 'fee', false])
  add('Mercadeo y ventas', p.noDistribuidos.mercadeo, 'g', true)
  add('Mantenimiento y fuerza', p.noDistribuidos.mantenimiento, 'g', true)
  add('Total no distribuidos', p.noDistribuidos.total, 'sub', true)

  add('GOP · Gross Operating Profit', p.gop, 'gop')

  head('OPERADOR')
  add('Utilidad bruta operador (10%)', p.operador.bruta, 'g', true)
  add('Fee de marca', p.operador.feeMarca, 'g', true)
  add('Utilidad total operador', p.operador.total, 'sub', true)

  add('Utilidad inversionistas', p.inversionistas.total, 'gop')
  add('FARA', p.inversionistas.fara, 'g', true)
  add('Predial', p.inversionistas.predial, 'g', true)
  add('Fiducia', p.inversionistas.fiducia, 'g', true)
  add('Póliza de seguros', p.inversionistas.poliza, 'g', true)
  add('UTILIDAD A DISTRIBUIR', p.inversionistas.distribuir, 'final')

  return rows
}

// Valor con signo para una celda (resta -> negativo). null -> guion.
function cel(v, resta) {
  if (v == null) return '—'
  const x = (resta && v !== 0) ? -Math.abs(v) : v
  return signo(x)
}

// ===================== EXCEL — INFORME FINANCIERO (.xls) =====================
export function exportarExcelInforme(data, mes) {
  if (!data) return
  const r = data.resumen || {}
  const cierre = !!data.tieneCierre
  const recibos = data.recibos || []
  const filas = filasUSALI(data)
  const fee = (data.pnl && data.pnl.feeSolara) || {}

  const th = `style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold;text-align:left"`
  const thr = `style="background:${MARCA.negro};color:#fff;padding:6px 10px;font-weight:bold;text-align:right"`
  const td = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5"`
  const tdr = `style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right"`

  let h = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">`

  h += `<table><tr><td style="font-size:20px;font-weight:bold;color:${MARCA.negro}">✳ WELLCOMM &nbsp;Spa &amp; Hotel</td></tr>
  <tr><td style="font-size:13px;color:${MARCA.muted}">Liquidación · P&L Oficial (USALI) · ${mes}${cierre ? ' · Cierre real vs presupuesto' : ' · Presupuesto (mes sin cierre)'}</td></tr>
  <tr><td style="font-size:11px;color:${MARCA.muted}">Where you are the luxury</td></tr></table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Indicador en vivo (Cloudbeds)</td><td ${thr}>Valor</td></tr>
  <tr><td ${td}>Ocupación</td><td ${tdr}>${r.ocupacion || 0}%</td></tr>
  <tr><td ${td}>ADR</td><td ${tdr}>${fmtCOP(r.adr)}</td></tr>
  <tr><td ${td}>RevPAR</td><td ${tdr}>${fmtCOP(r.revpar)}</td></tr>
  <tr><td ${td}>Noches vendidas</td><td ${tdr}>${r.noches || 0}</td></tr></table><br/>`

  h += `<table border="0" cellspacing="0"><tr><td ${th}>Cuenta de Resultados</td><td ${thr}>Presupuesto</td><td ${thr}>${cierre ? 'Real' : 'En curso'}</td></tr>`
  filas.forEach(([label, ppto, real, tipo, resta]) => {
    if (tipo === 'header') {
      h += `<tr><td colspan="3" style="background:${MARCA.negro};color:${MARCA.sage};padding:6px 10px;font-weight:bold;letter-spacing:1px">${label}</td></tr>`
      return
    }
    if (tipo === 'fee') {
      h += `<tr><td style="padding:4px 10px 4px 22px;border-bottom:1px solid #f0f0f0;color:${MARCA.gold};font-style:italic">${label}</td><td style="padding:4px 10px;border-bottom:1px solid #f0f0f0;text-align:right;color:${MARCA.gold};font-style:italic">incl. ${fmtCOP(ppto)}</td><td style="border-bottom:1px solid #f0f0f0"></td></tr>`
      return
    }
    const isBig = tipo === 'gop' || tipo === 'final'
    const isSub = tipo === 'sub'
    const bg = isBig ? `background:${MARCA.sage};font-weight:bold;` : isSub ? `background:#f0f0f0;font-weight:bold;` : ''
    const lblColor = tipo === 'g' ? `color:${MARCA.muted};` : ''
    h += `<tr><td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;${bg}${lblColor}">${label}</td>` +
         `<td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${cel(ppto, resta)}</td>` +
         `<td style="padding:5px 10px;border-bottom:1px solid #e5e5e5;text-align:right;${bg}">${cel(real, resta)}</td></tr>`
  })
  h += `</table><br/>`

  if (fee.aplicado) {
    h += `<table border="0" cellspacing="0"><tr><td ${th}>Fee de gestión SOLARA</td><td ${thr}>Monto</td></tr>
    <tr><td ${td}>Fijo mensual</td><td ${tdr}>${fmtCOP(fee.fijo)}</td></tr>
    <tr><td ${td}>Variable (5% del GOP antes de fee)</td><td ${tdr}>${fmtCOP(fee.variable)}</td></tr>
    <tr><td style="padding:5px 10px;background:#f0f0f0;font-weight:bold">Total fee SOLARA</td><td style="padding:5px 10px;text-align:right;background:#f0f0f0;font-weight:bold">${fmtCOP(fee.total)}</td></tr></table>
    <table><tr><td style="font-size:10px;color:${MARCA.muted};padding-top:4px">Imputado en Asesoría (Administración y Generales), antes del GOP.</td></tr></table><br/>`
  }

  if (recibos.length) {
    h += `<table border="0" cellspacing="0"><tr><td ${th}>Recibos del mes (anexo interno)</td><td ${th}>Fecha</td><td ${th}>Categoría</td><td ${thr}>Monto</td></tr>`
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
  a.download = `WELLcomm_Liquidacion_${mes}.xls`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===================== PDF — INFORME FINANCIERO =====================
export function exportarPDFInforme(data, mes) {
  if (!data) return
  const w = window.open('', '_blank')
  if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return }

  const r = data.resumen || {}
  const cierre = !!data.tieneCierre
  const recibos = data.recibos || []
  const filas = filasUSALI(data)
  const fee = (data.pnl && data.pnl.feeSolara) || {}

  const plHTML = filas.map(([label, ppto, real, tipo, resta]) => {
    if (tipo === 'header') return `<tr class="sec"><td colspan="3">${label}</td></tr>`
    if (tipo === 'fee') return `<tr class="fee"><td>${label}</td><td class="num">incl. ${fmtCOP(ppto)}</td><td class="num"></td></tr>`
    const cls = tipo === 'sub' ? 'sub' : tipo === 'gop' ? 'gop' : tipo === 'final' ? 'tot' : tipo === 'g' ? 'g' : ''
    return `<tr class="${cls}"><td>${label}</td><td class="num">${cel(ppto, resta)}</td><td class="num">${cel(real, resta)}</td></tr>`
  }).join('')

  const feeHTML = fee.aplicado ? `
    <h2>Fee de gestión SOLARA</h2>
    <table class="tbl">
      <tr><td>Fijo mensual</td><td style="text-align:right">${fmtCOP(fee.fijo)}</td></tr>
      <tr><td>Variable (5% del GOP antes de fee)</td><td style="text-align:right">${fmtCOP(fee.variable)}</td></tr>
      <tr class="cat"><td>Total fee SOLARA</td><td style="text-align:right">${fmtCOP(fee.total)}</td></tr>
    </table>
    <p class="note">Imputado en Asesoría (Administración y Generales), antes del GOP. Ya restado en la cascada de este mes.</p>` : ''

  const recibosHTML = recibos.length ? `
    <h2>Recibos del mes <span class="anx">· anexo interno</span></h2>
    <table class="tbl">
      <tr class="head"><th>Proveedor</th><th>Fecha</th><th>Categoría</th><th style="text-align:right">Monto</th></tr>
      ${recibos.map(rc => `<tr><td>${rc.proveedor || ''}</td><td>${rc.fecha || ''}</td><td>${rc.categoria || ''}</td><td style="text-align:right">${fmtCOP(rc.importe)}</td></tr>`).join('')}
    </table>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WELLcomm · Liquidación ${mes}</title>
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
    h2 .anx { font-size: 10px; color: ${MARCA.muted}; font-weight: 400; font-style: italic; }
    .badge { display:inline-block; font-size:10px; font-weight:700; letter-spacing:.5px; padding:3px 10px; border-radius:20px; margin-top:6px; }
    .kpis { display: flex; gap: 10px; margin-top: 10px; }
    .kpi { flex: 1; border: 1px solid #e5e5e5; border-top: 3px solid ${MARCA.sage}; border-radius: 8px; padding: 10px 12px; }
    .kpi .v { font-size: 18px; font-weight: 700; }
    .kpi .l { font-size: 9px; color: ${MARCA.muted}; text-transform: uppercase; letter-spacing: .5px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
    .tbl td, .tbl th { padding: 5px 8px; border-bottom: 1px solid #eee; }
    .tbl th { background: ${MARCA.negro}; color: #fff; text-align: left; }
    .tbl .num { text-align: right; white-space: nowrap; }
    .pl td { font-size: 11px; }
    .pl .sec td { background: ${MARCA.negro}; color: ${MARCA.sage}; font-weight: 700; letter-spacing: 1px; font-size: 10px; text-transform: uppercase; }
    .pl .sub td { font-weight: 700; background: #f4f4f4; border-top: 1px solid #ccc; }
    .pl .gop td { font-weight: 800; font-size: 12px; background: #eef7f1; border-top: 1px solid ${MARCA.sage}; }
    .pl .tot td { font-weight: 800; font-size: 13px; background: ${MARCA.sage}; }
    .pl .g td { color: ${MARCA.muted}; }
    .pl .fee td { color: ${MARCA.gold}; font-style: italic; }
    .pl .cat td { font-weight: 700; background: #fafafa; }
    .note { font-size: 9px; color: ${MARCA.muted}; margin: 4px 0 0; }
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
        <div class="sub">SPA &amp; HOTEL · LIQUIDACIÓN · P&L OFICIAL · ${mes}</div>
        <div class="tag">Where you are the luxury</div>
      </div>
    </div>
    <div class="wrap">
      <div class="badge" style="background:${cierre ? '#e8f5ee' : '#faf3e2'};color:${cierre ? '#1d7a46' : MARCA.gold}">${cierre ? '✓ CIERRE OFICIAL DEL BOARD' : '◷ MES EN CURSO · VS PRESUPUESTO'}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${r.ocupacion || 0}%</div><div class="l">Ocupación</div></div>
        <div class="kpi"><div class="v">${fmtCOP(r.adr)}</div><div class="l">ADR</div></div>
        <div class="kpi"><div class="v">${fmtCOP(r.revpar)}</div><div class="l">RevPAR</div></div>
      </div>

      <h2>Cuenta de Resultados</h2>
      <table class="tbl pl">
        <tr class="head"><th>Concepto</th><th class="num">Presupuesto</th><th class="num">${cierre ? 'Real' : 'En curso'}</th></tr>
        ${plHTML}
      </table>

      ${feeHTML}

      ${recibosHTML}

      <div class="footer">
        <span>WELLcomm Spa &amp; Hotel · El Poblado, Medellín · Operación Wllmm SAS</span>
        <span>Generado ${new Date().toLocaleDateString('es-CO')}</span>
      </div>
      <p class="note">Fuente: P&L oficial del board (PPTO2026, estructura USALI). Habitaciones del mes corriente se actualiza en vivo con Cloudbeds. ${fee.aplicado ? 'El fee de gestión SOLARA está proyectado en Asesoría para meses sin cierre.' : ''}</p>
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
