const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

// Las 25 habitaciones reales con su tipo y piso
const HABITACIONES = [
  { id: '301', tipo: 'Suite Ejecutiva', piso: 3 },
  { id: '302', tipo: 'Estándar', piso: 3 },
  { id: '303', tipo: 'Superior', piso: 3 },
  { id: '304', tipo: 'Estándar', piso: 3 },
  { id: '305', tipo: 'Estándar', piso: 3 },
  { id: '306', tipo: 'Suite Ejecutiva', piso: 3 },
  { id: '307', tipo: 'Suite Ejecutiva', piso: 3 },
  { id: '401', tipo: 'Suite Ejecutiva', piso: 4 },
  { id: '402', tipo: 'Estándar', piso: 4 },
  { id: '403', tipo: 'Superior', piso: 4 },
  { id: '404', tipo: 'Estándar', piso: 4 },
  { id: '405', tipo: 'Estándar', piso: 4 },
  { id: '406', tipo: 'Suite Ejecutiva', piso: 4 },
  { id: '407', tipo: 'Suite Ejecutiva', piso: 4 },
  { id: '501', tipo: 'Suite Ejecutiva', piso: 5 },
  { id: '502', tipo: 'Estándar', piso: 5 },
  { id: '503', tipo: 'Superior', piso: 5 },
  { id: '504', tipo: 'Estándar', piso: 5 },
  { id: '505', tipo: 'Estándar', piso: 5 },
  { id: '506', tipo: 'Suite Presidencial', piso: 5 },
  { id: '601', tipo: 'Suite Ejecutiva', piso: 6 },
  { id: '602', tipo: 'Estándar', piso: 6 },
  { id: '603', tipo: 'Superior', piso: 6 },
  { id: '604', tipo: 'Estándar', piso: 6 },
  { id: '605', tipo: 'Suite Presidencial', piso: 6 },
]

// Zonas comunes (aseo manual, no vienen de Cloudbeds)
const ZONAS_COMUNES = [
  { id: 'spa', nombre: 'Spa' },
  { id: 'terraza', nombre: 'Terraza' },
  { id: 'lobby', nombre: 'Lobby' },
  { id: 'pasillos', nombre: 'Pasillos y escalas' },
  { id: 'ascensor', nombre: 'Ascensor' },
  { id: 'empleados', nombre: 'Cuarto de empleados' },
  { id: 'oficina', nombre: 'Oficina' },
  { id: 'banos', nombre: 'Baños comunes' },
  { id: 'fachada', nombre: 'Fachada' },
  { id: 'cocina', nombre: 'Cocina' },
  { id: 'otros', nombre: 'Otros' },
]

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

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function traerDetallesEnLotes(reservas, headers, tamLote = 15, pausaMs = 250) {
  const resultados = []
  for (let i = 0; i < reservas.length; i += tamLote) {
    const lote = reservas.slice(i, i + tamLote)
    const detallesLote = await Promise.all(
      lote.map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          return (await dr.json())?.data || null
        } catch { return null }
      })
    )
    resultados.push(...detallesLote)
    if (i + tamLote < reservas.length) await sleep(pausaMs)
  }
  return resultados
}

function extraerNumero(roomName) {
  if (!roomName) return null
  const m = String(roomName).match(/(\d{3})/)
  return m ? m[1] : null
}

async function getMovimientosCloudbeds() {
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  const hoy = new Date().toISOString().slice(0, 10)

  const movimientos = {}

  try {
    const enCasaRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=40`, { headers })
    const enCasa = normalizar(await enCasaRes.json())
    const detallesEnCasa = await traerDetallesEnLotes(enCasa, headers)

    detallesEnCasa.forEach(d => {
      if (!d) return
      const saleHoy = d.endDate === hoy
      ;(d.assigned || []).forEach(a => {
        const num = extraerNumero(a.roomName)
        if (num) movimientos[num] = saleHoy ? 'sale_hoy' : 'ocupada'
      })
    })

    const llegadasRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&checkInFrom=${hoy}&checkInTo=${hoy}&pageSize=40`, { headers })
    const llegadas = normalizar(await llegadasRes.json())
    const detallesLlegadas = await traerDetallesEnLotes(llegadas, headers)

    detallesLlegadas.forEach(d => {
      if (!d) return
      ;(d.assigned || []).forEach(a => {
        const num = extraerNumero(a.roomName)
        if (num && !movimientos[num]) movimientos[num] = 'llega_hoy'
      })
    })

    return movimientos
  } catch (e) {
    return movimientos
  }
}

function ahoraColombia() {
  const now = new Date(Date.now() - 5 * 3600000)
  return now.toISOString().slice(11, 16) // HH:MM
}

// Construye el listado de las 25 habitaciones con estado/movimiento/autor/esManual
function construirHabitaciones(estados, movimientos, hoy) {
  return HABITACIONES.map(h => {
    const guardado = estados[h.id]
    const movimiento = movimientos[h.id] || 'libre'

    let estado, autor = null, hora = null, esManual = false
    if (guardado && guardado.fecha === hoy && guardado.manual) {
      estado = guardado.estado
      autor = guardado.autor || null
      hora = guardado.hora || null
      esManual = true
    } else {
      if (movimiento === 'ocupada' || movimiento === 'sale_hoy') estado = 'ocupada'
      else estado = 'limpia'
      esManual = false
    }

    return { ...h, estado, movimiento, autor, hora, esManual }
  })
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const hoy = new Date().toISOString().slice(0, 10)

    // ── CRON: precalentar el movimiento del día (5-6am) ──
    // Llamar como GET /api/habitaciones?cron=CRON_SECRET
    if (req.method === 'GET' && req.query.cron) {
      if (req.query.cron !== CRON_SECRET) {
        return res.status(401).json({ error: 'No autorizado' })
      }
      const movimientos = await getMovimientosCloudbeds()
      // Guardamos una foto del movimiento de arranque del día (para auditoría / precalentado)
      await kvSet('habitaciones_movimiento_cache', { fecha: hoy, movimientos, ts: new Date().toISOString() })
      return res.status(200).json({ ok: true, fecha: hoy, precalentado: Object.keys(movimientos).length })
    }

    // ── POST ──
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // Historial de una habitación
      if (body.action === 'historial') {
        const historiales = await kvGet('habitaciones_historial') || {}
        return res.status(200).json({ ok: true, historial: historiales[body.habitacionId] || [] })
      }

      // Historial de una zona común
      if (body.action === 'historial_zona') {
        const historiales = await kvGet('areas_comunes_historial') || {}
        return res.status(200).json({ ok: true, historial: historiales[body.zonaId] || [] })
      }

      // Actualizar estado de aseo de una zona común
      if (body.action === 'estado_zona') {
        const { zonaId, estado, usuario } = body
        const autor = usuario || 'Desconocido'
        const hora = ahoraColombia()

        const estados = await kvGet('areas_comunes_estados') || {}
        estados[zonaId] = { estado, fecha: hoy, autor, hora, actualizado: new Date().toISOString() }
        await kvSet('areas_comunes_estados', estados)

        const historiales = await kvGet('areas_comunes_historial') || {}
        const histZona = historiales[zonaId] || []
        histZona.unshift({ estado, autor, hora, fecha: hoy, ts: new Date().toISOString() })
        historiales[zonaId] = histZona.slice(0, 50)
        await kvSet('areas_comunes_historial', historiales)

        return res.status(200).json({ ok: true })
      }

      // Actualizar estado manual de una habitación
      const { habitacionId, estado, usuario } = body
      const autor = usuario || 'Desconocido'
      const hora = ahoraColombia()

      const estados = await kvGet('habitaciones_estados') || {}
      estados[habitacionId] = { estado, fecha: hoy, manual: true, autor, hora, actualizado: new Date().toISOString() }
      await kvSet('habitaciones_estados', estados)

      const historiales = await kvGet('habitaciones_historial') || {}
      const histHab = historiales[habitacionId] || []
      histHab.unshift({ estado, autor, hora, fecha: hoy, ts: new Date().toISOString() })
      historiales[habitacionId] = histHab.slice(0, 50)
      await kvSet('habitaciones_historial', historiales)

      return res.status(200).json({ ok: true })
    }

    // ── GET: 25 habitaciones + zonas comunes ──
    const [estadosGuardados, movimientos, estadosZonas] = await Promise.all([
      kvGet('habitaciones_estados'),
      getMovimientosCloudbeds(),
      kvGet('areas_comunes_estados'),
    ])

    const estados = estadosGuardados || {}
    const habitaciones = construirHabitaciones(estados, movimientos, hoy)

    // Zonas comunes: estado de aseo manual; si es de hoy se respeta, si no, "limpia" por defecto
    const ez = estadosZonas || {}
    const zonas = ZONAS_COMUNES.map(z => {
      const g = ez[z.id]
      if (g && g.fecha === hoy) {
        return { ...z, estado: g.estado, autor: g.autor || null, hora: g.hora || null, esManual: true }
      }
      return { ...z, estado: 'limpia', autor: null, hora: null, esManual: false }
    })

    // Conteo de cuántas habitaciones están en estado automático vs manual hoy
    const totalManual = habitaciones.filter(h => h.esManual).length
    const totalAuto = habitaciones.length - totalManual

    return res.status(200).json({ habitaciones, zonas, fecha: hoy, totalManual, totalAuto })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
