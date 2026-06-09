const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// ════════════════════════════════════════════════════════════════════
// PRESUPUESTO OFICIAL 2026 — APROBADO POR ACCIONISTAS
// Fuente: P&L presupuestal oficial WELLcomm. Cifras en COP.
// Para clonar la app a otro hotel, reemplaza estos valores.
// ════════════════════════════════════════════════════════════════════
const PRESUPUESTO_OFICIAL_2026 = {
  habitaciones: {
    1:  { ventas: 204491089, adr: 420000 },
    2:  { ventas: 226040842, adr: 430000 },
    3:  { ventas: 180395173, adr: 400000 },
    4:  { ventas: 190432673, adr: 410000 },
    5:  { ventas: 173949505, adr: 395000 },
    6:  { ventas: 175066089, adr: 398000 },
    7:  { ventas: 211789258, adr: 415000 },
    8:  { ventas: 264199010, adr: 450000 },
    9:  { ventas: 172432673, adr: 400000 },
    10: { ventas: 208786510, adr: 415000 },
    11: { ventas: 208324010, adr: 415000 },
    12: { ventas: 235291510, adr: 440000 },
  },
  ab: {
    1: 129657321, 2: 140672397, 3: 123993103, 4: 126634612,
    5: 125427408, 6: 120922366, 7: 131453924, 8: 148562909,
    9: 122697306, 10: 128356361, 11: 133689294, 12: 148087989,
  },
  spa: {
    1: 82140500, 2: 83070000, 3: 86229000, 4: 82621500,
    5: 90424750, 6: 91208000, 7: 91780000, 8: 113893000,
    9: 96391750, 10: 82810000, 11: 84864000, 12: 89492000,
  },
}

const DIAS_MES_2026 = { 1:31, 2:28, 3:31, 4:30, 5:31, 6:30, 7:31, 8:31, 9:30, 10:31, 11:30, 12:31 }

async function kvGet(key) {
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const data = await res.json()
    if (data.result === null || data.result === undefined) return null
    let result = data.result
    while (typeof result === 'string') {
      try { result = JSON.parse(result) } catch { break }
    }
    return result
  } catch (e) { return null }
}

async function kvSet(key, value) {
  const encoded = encodeURIComponent(JSON.stringify(value))
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
}

async function getFreshToken() {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.CLOUDBEDS_CLIENT_ID,
    client_secret: process.env.CLOUDBEDS_CLIENT_SECRET,
    refresh_token: process.env.CLOUDBEDS_REFRESH_TOKEN
  })
  const res = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })
  const data = await res.json()
  return data.access_token || process.env.CLOUDBEDS_ACCESS_TOKEN
}

function calcNights(startDate, endDate) {
  const ms = new Date(endDate) - new Date(startDate)
  return Math.max(1, Math.round(ms / 86400000))
}

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const MESES_NOMBRE = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ── Presupuesto de habitaciones (oficial, desde código) ──
function getPresupuesto() {
  const meses = {}
  for (let m = 1; m <= 12; m++) {
    const o = PRESUPUESTO_OFICIAL_2026.habitaciones[m]
    if (!o) continue
    const dias = DIAS_MES_2026[m]
    const habVendidas = o.adr > 0 ? Math.round(o.ventas / o.adr) : 0
    const ocupacion = (25 * dias) > 0 ? (habVendidas / (25 * dias)) : 0
    meses[m] = {
      mes: MESES_NOMBRE[m],
      mesNumero: m,
      habVendidas,
      tarifa: o.adr,
      ventas: o.ventas,
      ocupacion,
    }
  }
  return meses
}

// ── Presupuesto simple A&B / Spa (oficial, desde código) ──
function getPresupuestoSimple(linea) {
  const fuente = PRESUPUESTO_OFICIAL_2026[linea] || {}
  const meses = {}
  for (let m = 1; m <= 12; m++) {
    if (fuente[m] === undefined) continue
    meses[m] = { mes: MESES_NOMBRE[m], mesNumero: m, ventas: fuente[m] }
  }
  return meses
}

// ── Lee el REAL de Cloudbeds para un mes (YYYY-MM), noche por noche ──
async function getRealMes(headers, anioMes) {
  const [anio, mes] = anioMes.split('-').map(Number)
  const primerDia = `${anioMes}-01`
  const ultimoDiaNum = new Date(anio, mes, 0).getDate()
  const ultimoDia = `${anioMes}-${String(ultimoDiaNum).padStart(2, '0')}`

  let reservas = []
  try {
    for (let page = 1; page <= 6; page++) {
      const r = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?checkInTo=${ultimoDia}&checkOutFrom=${primerDia}&pageSize=100&pageNumber=${page}`, { headers })
      const lote = normalizar(await r.json())
      reservas = reservas.concat(lote)
      if (lote.length < 100) break
    }
  } catch (e) {}

  const validas = reservas.filter(r => {
    const s = (r.status || '').toLowerCase()
    return ['checked_in', 'checked_out', 'confirmed'].includes(s)
  })

  let ingresos = 0
  let nochesVendidas = 0
  for (let i = 0; i < validas.length; i += 15) {
    const lote = validas.slice(i, i + 15)
    const detalles = await Promise.all(lote.map(async r => {
      try {
        const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
        return (await dr.json())?.data || null
      } catch { return null }
    }))
    detalles.forEach(d => {
      if (!d) return
      ;(d.assigned || []).forEach(a => {
        (a.dailyRates || []).forEach(dr => {
          if (dr.date >= primerDia && dr.date <= ultimoDia) {
            ingresos += parseFloat(dr.rate || 0)
            nochesVendidas += 1
          }
        })
      })
    })
    if (i + 15 < validas.length) await sleep(250)
  }

  const habDisponibles = 25 * ultimoDiaNum
  const tarifaReal = nochesVendidas > 0 ? Math.round(ingresos / nochesVendidas) : 0
  const ocupacionReal = habDisponibles > 0 ? (nochesVendidas / habDisponibles) : 0

  return {
    habVendidas: nochesVendidas,
    tarifa: tarifaReal,
    ventas: Math.round(ingresos),
    ocupacion: ocupacionReal,
    habDisponibles,
  }
}

const HABITACIONES = {
  estandar: {
    nombre: 'Estándar', cantidad: 11, m2: 20,
    bar: 480000, minimo: 420000, maximo: 580000,
    descripcion: 'Tarifa de entrada · Queen 20m² · todas las amenidades'
  },
  superior: {
    nombre: 'Superior', cantidad: 4, m2: 22,
    bar: 530000, minimo: 460000, maximo: 640000,
    descripcion: 'Tonos neutros · madera natural · Rain Shower · 22m²'
  },
  ejecutiva: {
    nombre: 'Suite Ejecutiva', cantidad: 8, m2: 28,
    bar: 580000, minimo: 510000, maximo: 700000,
    descripcion: 'Cama King · 28m² · la más vendida del hotel'
  },
  presidencial: {
    nombre: 'Suite Presidencial', cantidad: 2, m2: 45,
    bar: 650000, minimo: 580000, maximo: 780000,
    descripcion: 'Espejo de agua · sala · 45m² · masaje 20min en Genius/VIP/Directo'
  }
}

const TOTAL_HAB = 25

const CANALES = {
  ota_rack:        { label: 'OTA Rack',             descuento: 0,     beneficios: ['Add-on $30 USD'] },
  genius_vip:      { label: 'Genius / VIP',          descuento: 0,     beneficios: ['Termal ✓', 'F&B 15% dto ✓'] },
  directo:         { label: 'Directo',               descuento: 0,     beneficios: ['Termal ✓', 'F&B 15% dto ✓', 'Late CO gratis ✓'] },
  no_reembolsable: { label: 'No Reembolsable',       descuento: -0.15, beneficios: ['Sin spa', 'Pago al reservar'] },
  corporate:       { label: 'Corporate + Grupos',    descuento: -0.15, beneficios: ['Desayuno incl.', 'Sin spa', 'Mín 5 hab', 'Depósito 30%'] },
  agencia:         { label: 'Agencia / B2B (TAAP)',  descuento: -0.12, beneficios: ['Comisión neta', 'Mín 2 noches'] },
  last_minute:     { label: 'Last Minute (D-3)',     descuento: -0.10, beneficios: ['Solo si occ. <55%'] }
}

const COMPETENCIA_BASE = {
  'Botánica Casa Hotel Manila':     { bar_base: 190000, estrellas: 3, notas: 'Sin spa · desayuno incl.' },
  'Celestino Boutique Hotel & Spa': { bar_base: 430000, estrellas: 4, notas: 'Con spa · Lleras · competidor directo' },
  'Golden Valley Hotel':            { bar_base: 280000, estrellas: 3, notas: 'Sin spa' },
  'Landmark Hotel':                 { bar_base: 250000, estrellas: 3, notas: 'Budget' },
  'Moabi Hotel':                    { bar_base: 320000, estrellas: 4, notas: 'Boutique' },
  'Nomada Hotel Origen':            { bar_base: 370000, estrellas: 4, notas: 'Manila · boutique' },
  'Sloh Hotel & Bar Manila':        { bar_base: 400000, estrellas: 4, notas: 'Manila · bar incluido' },
  'The Host Medellin Adults Only':  { bar_base: 350000, estrellas: 4, notas: 'Adults only' },
  'The Somos Bold':                 { bar_base: 420000, estrellas: 4, notas: 'Poblado · diseño' },
}

const EVENTOS_MEDELLIN = [
  { nombre: 'Feria de las Flores',          inicio: '2026-08-01', fin: '2026-08-10', factor: 1.35, tipo: 'mega' },
  { nombre: 'Festival Internacional de Jazz', inicio: '2026-09-25', fin: '2026-09-30', factor: 1.20, tipo: 'alto' },
  { nombre: 'Colombiamoda',                 inicio: '2026-07-22', fin: '2026-07-24', factor: 1.25, tipo: 'alto' },
  { nombre: 'Semana Santa',                 inicio: '2026-03-29', fin: '2026-04-05', factor: 1.30, tipo: 'alto' },
  { nombre: 'Día de la Madre',              inicio: '2026-05-10', fin: '2026-05-11', factor: 1.20, tipo: 'medio' },
  { nombre: 'Festival Tango',               inicio: '2026-06-05', fin: '2026-06-15', factor: 1.15, tipo: 'medio' },
  { nombre: 'Navidad Medellín',             inicio: '2026-12-01', fin: '2026-12-31', factor: 1.40, tipo: 'mega' },
  { nombre: 'Año Nuevo',                    inicio: '2026-12-30', fin: '2027-01-02', factor: 1.50, tipo: 'mega' },
]

function getEventosFecha(fecha) {
  return EVENTOS_MEDELLIN.filter(e => fecha >= e.inicio && fecha <= e.fin)
}

function calcularBARRecomendado(tipoHab, ocupacionActual, fecha, preciosCompetencia) {
  const hab = HABITACIONES[tipoHab]
  if (!hab) return null

  const d = new Date(fecha + 'T12:00:00')
  const diaSemana = d.getDay()
  const esFinDeSemana = diaSemana === 5 || diaSemana === 6

  let factorOcupacion = 1.0
  if      (ocupacionActual >= 85) factorOcupacion = 1.20
  else if (ocupacionActual >= 75) factorOcupacion = 1.15
  else if (ocupacionActual >= 65) factorOcupacion = 1.08
  else if (ocupacionActual >= 55) factorOcupacion = 1.03
  else if (ocupacionActual <= 30) factorOcupacion = 0.92
  else if (ocupacionActual <= 40) factorOcupacion = 0.96

  const factorFDS = esFinDeSemana ? 1.12 : 1.0

  const eventos = getEventosFecha(fecha)
  const factorEvento = eventos.length > 0
    ? Math.max(...eventos.map(e => e.factor))
    : 1.0

  let factorComp = 1.0
  if (preciosCompetencia && preciosCompetencia.length > 0) {
    const mediaComp = preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length
    const ratio = hab.bar / mediaComp
    if (ratio < 0.85) factorComp = 1.05
    else if (ratio > 1.20) factorComp = 0.97
  }

  let barRecomendado = hab.bar * factorOcupacion * factorFDS * factorEvento * factorComp
  barRecomendado = Math.max(hab.minimo, Math.min(hab.maximo, barRecomendado))
  barRecomendado = Math.round(barRecomendado / 1000) * 1000

  const tarifasCanal = {}
  Object.entries(CANALES).forEach(([key, canal]) => {
    let precio = barRecomendado * (1 + canal.descuento)
    precio = Math.round(precio / 1000) * 1000
    tarifasCanal[key] = { precio, label: canal.label, beneficios: canal.beneficios }
  })

  const diff = ((barRecomendado - hab.bar) / hab.bar) * 100
  let accion = 'mantener'
  let accionLabel = '✅ Mantener tarifa'
  let accionColor = '#7EC8A0'
  if (diff > 5)  { accion = 'subir'; accionLabel = `⬆️ Subir a $${(barRecomendado/1000).toFixed(0)}K`;  accionColor = '#27ae60' }
  if (diff < -5) { accion = 'bajar'; accionLabel = `⬇️ Bajar a $${(barRecomendado/1000).toFixed(0)}K`; accionColor = '#e74c3c' }

  return {
    tipo: tipoHab,
    nombre: hab.nombre,
    barActual: hab.bar,
    barRecomendado,
    diferencia: Math.round(diff),
    accion, accionLabel, accionColor,
    tarifasCanal,
    factores: {
      ocupacion:    Math.round((factorOcupacion - 1) * 100),
      finDeSemana:  esFinDeSemana ? Math.round((factorFDS - 1) * 100) : 0,
      eventos:      eventos.map(e => e.nombre),
      factorEvento: Math.round((factorEvento - 1) * 100),
      competencia:  Math.round((factorComp - 1) * 100)
    }
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const body = req.method === 'POST'
      ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
      : {}

    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    const today = new Date().toISOString().split('T')[0]

    // ── GET con accion=presupuesto: comparar presupuesto vs real (HABITACIONES) ──
    if (req.method === 'GET' && req.query.accion === 'presupuesto') {
      const presupuesto = getPresupuesto()
      const mesPedido = req.query.mes || today.slice(0, 7)

      const real = await getRealMes(headers, mesPedido)
      const mesNum = Number(mesPedido.split('-')[1])
      const ppto = presupuesto[mesNum] || null

      const meses = []
      for (let m = 1; m <= 12; m++) {
        const p = presupuesto[m]
        if (!p) continue
        meses.push({
          mesNumero: m,
          mes: p.mes,
          pptoVentas: p.ventas,
          pptoHab: p.habVendidas,
          pptoTarifa: p.tarifa,
          pptoOcupacion: p.ocupacion,
          esMesActual: m === mesNum,
        })
      }

      let cumplimiento = null
      if (ppto) {
        cumplimiento = {
          mes: ppto.mes,
          anioMes: mesPedido,
          ppto: { ventas: ppto.ventas, habVendidas: ppto.habVendidas, tarifa: ppto.tarifa, ocupacion: ppto.ocupacion },
          real: { ventas: real.ventas, habVendidas: real.habVendidas, tarifa: real.tarifa, ocupacion: real.ocupacion },
          cumplimientoVentas: ppto.ventas > 0 ? Math.round((real.ventas / ppto.ventas) * 100) : 0,
          cumplimientoHab: ppto.habVendidas > 0 ? Math.round((real.habVendidas / ppto.habVendidas) * 100) : 0,
          cumplimientoTarifa: ppto.tarifa > 0 ? Math.round((real.tarifa / ppto.tarifa) * 100) : 0,
          difVentas: real.ventas - ppto.ventas,
        }
      }

      const totalPptoAnio = Object.values(presupuesto).reduce((s, m) => s + (m.ventas || 0), 0)

      return res.status(200).json({ cumplimiento, meses, totalPptoAnio, mesConsultado: mesPedido })
    }

    // ── GET con accion=presupuesto_lineas: 3 líneas (Habitaciones + A&B + Spa) ──
    if (req.method === 'GET' && req.query.accion === 'presupuesto_lineas') {
      const mesPedido = req.query.mes || today.slice(0, 7)
      const mesNum = Number(mesPedido.split('-')[1])

      const pptoHab = getPresupuesto()
      const pptoAB = getPresupuestoSimple('ab')
      const pptoSpa = getPresupuestoSimple('spa')

      const [realHab, gastosMes] = await Promise.all([
        getRealMes(headers, mesPedido),
        kvGet(`gastos_${mesPedido}`),
      ])
      const ingManual = gastosMes?.ingresos || {}
      const realABVentas = Number(ingManual.terraza) || 0
      const realSpaVentas = Number(ingManual.spa) || 0

      const pptoHabVentas = pptoHab[mesNum]?.ventas || 0
      const pptoABVentas = pptoAB[mesNum]?.ventas || 0
      const pptoSpaVentas = pptoSpa[mesNum]?.ventas || 0

      const pct = (real, ppto) => ppto > 0 ? Math.round((real / ppto) * 100) : 0

      const lineas = [
        {
          id: 'habitaciones', label: '🏨 Habitaciones', fuente: 'Cloudbeds (en vivo)',
          ppto: pptoHabVentas, real: realHab.ventas, cumplimiento: pct(realHab.ventas, pptoHabVentas),
        },
        {
          id: 'ab', label: '🍽️ A&B / Terraza', fuente: 'Ingreso manual (Portal)',
          ppto: pptoABVentas, real: realABVentas, cumplimiento: pct(realABVentas, pptoABVentas),
        },
        {
          id: 'spa', label: '💆 Spa', fuente: 'Ingreso manual (Portal)',
          ppto: pptoSpaVentas, real: realSpaVentas, cumplimiento: pct(realSpaVentas, pptoSpaVentas),
        },
      ]

      const totalPpto = lineas.reduce((s, l) => s + l.ppto, 0)
      const totalReal = lineas.reduce((s, l) => s + l.real, 0)

      const anual = []
      for (let m = 1; m <= 12; m++) {
        const h = pptoHab[m]?.ventas || 0
        const a = pptoAB[m]?.ventas || 0
        const s = pptoSpa[m]?.ventas || 0
        if (h === 0 && a === 0 && s === 0) continue
        anual.push({
          mesNumero: m, mes: MESES_NOMBRE[m],
          habitaciones: h, ab: a, spa: s, total: h + a + s,
          esMesActual: m === mesNum,
        })
      }

      const totalAnioHab = Object.values(pptoHab).reduce((s, m) => s + (m.ventas || 0), 0)
      const totalAnioAB = Object.values(pptoAB).reduce((s, m) => s + (m.ventas || 0), 0)
      const totalAnioSpa = Object.values(pptoSpa).reduce((s, m) => s + (m.ventas || 0), 0)

      return res.status(200).json({
        mesConsultado: mesPedido,
        mes: MESES_NOMBRE[mesNum],
        lineas,
        totalPpto, totalReal,
        cumplimientoTotal: pct(totalReal, totalPpto),
        anual,
        totalesAnio: {
          habitaciones: totalAnioHab, ab: totalAnioAB, spa: totalAnioSpa,
          total: totalAnioHab + totalAnioAB + totalAnioSpa,
        },
      })
    }

    let ocupacionActual = 50
    let enCasa = 0
    let adrReal = 0
    let revparReal = 0
    let reservasFuturas = []

    try {
      const [enCasaRes, futuraRes] = await Promise.all([
        fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
        fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&pageSize=50`, { headers }),
      ])

      const enCasaLista = normalizar(await enCasaRes.json())
      reservasFuturas   = normalizar(await futuraRes.json())

      enCasa = enCasaLista.length
      ocupacionActual = Math.round((enCasa / TOTAL_HAB) * 100)

      const detalles = await Promise.all(
        enCasaLista.map(async r => {
          try {
            const dr = await fetch(
              `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`,
              { headers }
            )
            const dj = await dr.json()
            return dj?.data || null
          } catch { return null }
        })
      )

      let totalRevenue = 0
      let totalNoches  = 0
      detalles.forEach(d => {
        if (!d) return
        const rev    = parseFloat(d.total || 0)
        const nights = calcNights(d.startDate, d.endDate)
        if (rev > 0) { totalRevenue += rev; totalNoches += nights }
      })

      adrReal    = totalNoches > 0 ? Math.round(totalRevenue / totalNoches) : 0
      revparReal = Math.round((ocupacionActual / 100) * adrReal)

    } catch (e) {
      console.error('Cloudbeds error:', e.message)
    }

    // ── GET dashboard ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const preciosKV          = await kvGet('competencia_precios') || {}
      const ultimaActualizacion = await kvGet('competencia_ultima_actualizacion')

      const preciosComp = {}
      Object.entries(COMPETENCIA_BASE).forEach(([hotel, base]) => {
        preciosComp[hotel] = {
          precio:      preciosKV[hotel]?.precio || base.bar_base,
          precio_base: base.bar_base,
          estrellas:   base.estrellas,
          notas:       base.notas,
          esManual:    !!preciosKV[hotel]?.precio,
          actualizado: preciosKV[hotel]?.actualizado || 'Precio base investigado'
        }
      })

      const preciosCompArray = Object.values(preciosComp).map(h => h.precio).filter(Boolean)

      const fechas = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d.toISOString().split('T')[0]
      })

      const recomendaciones = {}
      Object.keys(HABITACIONES).forEach(tipo => {
        recomendaciones[tipo] = fechas.map(fecha => ({
          fecha,
          ...calcularBARRecomendado(tipo, ocupacionActual, fecha, preciosCompArray)
        }))
      })

      const alertas = []
      Object.keys(HABITACIONES).forEach(tipo => {
        const hoy = recomendaciones[tipo][0]
        if (hoy.diferencia > 10)  alertas.push({ tipo: 'subir', hab: hoy.nombre, mensaje: `Sube ${hoy.nombre} a ${(hoy.barRecomendado/1000).toFixed(0)}K (+${hoy.diferencia}%)`,  color: '#27ae60' })
        if (hoy.diferencia < -10) alertas.push({ tipo: 'bajar', hab: hoy.nombre, mensaje: `Baja ${hoy.nombre} a ${(hoy.barRecomendado/1000).toFixed(0)}K (${hoy.diferencia}%)`, color: '#e74c3c' })
      })

      if (reservasFuturas.length < 5) {
        alertas.unshift({
          tipo: 'comercial',
          hab: 'On the Books',
          mensaje: `⚠️ Solo ${reservasFuturas.length} reservas futuras confirmadas — activar estrategia comercial`,
          color: '#e74c3c'
        })
      }

      const eventosProximos = []
      for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() + i)
        const fecha = d.toISOString().split('T')[0]
        getEventosFecha(fecha).forEach(e => {
          if (!eventosProximos.find(ev => ev.nombre === e.nombre)) {
            eventosProximos.push({ ...e, diasParaEvento: i })
          }
        })
      }

      return res.status(200).json({
        ocupacionActual,
        enCasa,
        adrReal,
        revparReal,
        reservasFuturas: reservasFuturas.length,
        habitaciones: HABITACIONES,
        recomendaciones,
        alertas,
        eventosProximos,
        competencia: preciosComp,
        ultimaActualizacion,
        totalHab: TOTAL_HAB,
        fecha: today
      })
    }

    // ── POST ───────────────────────────────────────────────────────
    if (req.method === 'POST') {

      if (body.accion === 'actualizar_competencia') {
        await kvSet('competencia_precios', body.precios)
        await kvSet('competencia_ultima_actualizacion', new Date().toISOString())
        return res.status(200).json({ ok: true })
      }

      if (body.accion === 'copilot') {
        const { pregunta } = body
        const preciosKV = await kvGet('competencia_precios') || {}

        const preciosComp = {}
        Object.entries(COMPETENCIA_BASE).forEach(([hotel, base]) => {
          preciosComp[hotel] = { precio: preciosKV[hotel]?.precio || base.bar_base }
        })
        const preciosCompArray = Object.values(preciosComp).map(h => h.precio).filter(Boolean)
        const mediaComp = preciosCompArray.length > 0
          ? Math.round(preciosCompArray.reduce((a, b) => a + b, 0) / preciosCompArray.length)
          : 0

        const eventosHoy = getEventosFecha(today)
        const recsHoy = {}
        Object.keys(HABITACIONES).forEach(tipo => {
          recsHoy[tipo] = calcularBARRecomendado(tipo, ocupacionActual, today, preciosCompArray)
        })

        const mesActualNum = Number(today.slice(5, 7))
        const presupuesto = getPresupuesto()
        const pptoAB = getPresupuestoSimple('ab')
        const pptoSpa = getPresupuestoSimple('spa')
        const gastosMes = await kvGet(`gastos_${today.slice(0, 7)}`)
        const pptoMes = presupuesto[mesActualNum]
        const ingManual = gastosMes?.ingresos || {}
        let bloquePresupuesto = ''
        if (pptoMes) {
          bloquePresupuesto = `

PRESUPUESTO OFICIAL DE ${pptoMes.mes.toUpperCase()} 2026 (aprobado por accionistas):
- HABITACIONES: ventas $${pptoMes.ventas.toLocaleString('es-CO')} COP | ${pptoMes.habVendidas} hab-noche | tarifa $${pptoMes.tarifa.toLocaleString('es-CO')} | ocup. ${(pptoMes.ocupacion * 100).toFixed(1)}%
- A&B / TERRAZA: ventas presupuestadas $${(pptoAB[mesActualNum]?.ventas || 0).toLocaleString('es-CO')} COP | real registrado $${(Number(ingManual.terraza) || 0).toLocaleString('es-CO')} COP
- SPA: ventas presupuestadas $${(pptoSpa[mesActualNum]?.ventas || 0).toLocaleString('es-CO')} COP | real registrado $${(Number(ingManual.spa) || 0).toLocaleString('es-CO')} COP
Compara el ritmo real contra estos presupuestos cuando sea relevante. El real de A&B y Spa se ingresa manualmente cada día en el Portal del Propietario.`
        }

        const contexto = `Eres el Revenue Manager senior de WELLcomm Spa & Hotel, boutique wellness de 25 habitaciones en Manila, Medellín, Colombia. Gestionado por SOLARA Homes.

DATOS EN TIEMPO REAL HOY (${today}):
- Ocupación: ${ocupacionActual}% (${enCasa}/25 habitaciones)
- ADR real Cloudbeds: $${adrReal.toLocaleString('es-CO')} COP
- RevPAR real: $${revparReal.toLocaleString('es-CO')} COP
- Reservas futuras confirmadas (On the Books): ${reservasFuturas.length}
- Eventos activos hoy: ${eventosHoy.map(e => e.nombre).join(', ') || 'Ninguno'}${bloquePresupuesto}

ESTRUCTURA TARIFARIA:
- Estándar (11 hab, 20m²): BAR $480K | Mín $420K | Máx $580K
- Superior (4 hab, 22m²): BAR $530K | Mín $460K | Máx $640K
- Suite Ejecutiva (8 hab, 28m²): BAR $580K | Mín $510K | Máx $700K
- Suite Presidencial (2 hab, 45m²): BAR $650K | Mín $580K | Máx $780K

RECOMENDACIONES HOY:
${Object.values(recsHoy).map(r => `- ${r.nombre}: $${(r.barRecomendado/1000).toFixed(0)}K (${r.accionLabel})`).join('\n')}

COMPETENCIA (precios actuales Manila):
${Object.entries(preciosComp).map(([h, d]) => `- ${h}: $${(d.precio/1000).toFixed(0)}K`).join('\n')}
Media competencia: $${(mediaComp/1000).toFixed(0)}K
WELLcomm vs media: ${mediaComp > 0 ? (((480000/mediaComp)-1)*100).toFixed(1) : 'N/D'}% ${480000 > mediaComp ? 'sobre' : 'bajo'} la media

TARGETS AÑO 1: ADR $430K | RevPAR $301K | Ocupación 70%
ADR actual vs target: ${adrReal > 0 ? (((adrReal/430000)-1)*100).toFixed(1) : 'N/D'}%

Razona como el mejor revenue manager del mundo. Usa los datos reales. Da recomendaciones accionables con números exactos. Nunca recomiendes tarifas por debajo del mínimo de cada tipo de habitación. Responde en español.`

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: contexto,
            messages: [{ role: 'user', content: pregunta }]
          })
        })

        const claudeData = await claudeRes.json()
        const respuesta = claudeData.content?.[0]?.text || 'Error al consultar el Revenue Copilot.'
        return res.status(200).json({ respuesta })
      }
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
