const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// Las 25 habitaciones reales con su tipo y piso
const HABITACIONES = [
  // Piso 3
  { id: '301', tipo: 'Suite Ejecutiva', piso: 3 },
  { id: '302', tipo: 'Estándar', piso: 3 },
  { id: '303', tipo: 'Superior', piso: 3 },
  { id: '304', tipo: 'Estándar', piso: 3 },
  { id: '305', tipo: 'Estándar', piso: 3 },
  { id: '306', tipo: 'Suite Ejecutiva', piso: 3 },
  { id: '307', tipo: 'Suite Ejecutiva', piso: 3 },
  // Piso 4
  { id: '401', tipo: 'Suite Ejecutiva', piso: 4 },
  { id: '402', tipo: 'Estándar', piso: 4 },
  { id: '403', tipo: 'Superior', piso: 4 },
  { id: '404', tipo: 'Estándar', piso: 4 },
  { id: '405', tipo: 'Estándar', piso: 4 },
  { id: '406', tipo: 'Suite Ejecutiva', piso: 4 },
  { id: '407', tipo: 'Suite Ejecutiva', piso: 4 },
  // Piso 5
  { id: '501', tipo: 'Suite Ejecutiva', piso: 5 },
  { id: '502', tipo: 'Estándar', piso: 5 },
  { id: '503', tipo: 'Superior', piso: 5 },
  { id: '504', tipo: 'Estándar', piso: 5 },
  { id: '505', tipo: 'Estándar', piso: 5 },
  { id: '506', tipo: 'Suite Presidencial', piso: 5 },
  // Piso 6
  { id: '601', tipo: 'Suite Ejecutiva', piso: 6 },
  { id: '602', tipo: 'Estándar', piso: 6 },
  { id: '603', tipo: 'Superior', piso: 6 },
  { id: '604', tipo: 'Estándar', piso: 6 },
  { id: '605', tipo: 'Suite Presidencial', piso: 6 },
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

// Extrae el número de habitación de un roomName tipo "SE 306" → "306"
function extraerNumero(roomName) {
  if (!roomName) return null
  const m = String(roomName).match(/(\d{3})/)
  return m ? m[1] : null
}

// Lee Cloudbeds y devuelve el "movimiento del día" por habitación
async function getMovimientosCloudbeds() {
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  const hoy = new Date().toISOString().slice(0, 10)

  const movimientos = {} // { '306': 'ocupada' | 'sale_hoy' | 'llega_hoy' }

  try {
    // 1. Ocupadas ahora (checked_in)
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

    // 2. Llegadas hoy (confirmed con check-in hoy)
    const llegadasRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&checkInFrom=${hoy}&checkInTo=${hoy}&pageSize=40`, { headers })
    const llegadas = normalizar(await llegadasRes.json())
    const detallesLlegadas = await traerDetallesEnLotes(llegadas, headers)

    detallesLlegadas.forEach(d => {
      if (!d) return
      ;(d.assigned || []).forEach(a => {
        const num = extraerNumero(a.roomName)
        // Solo marcar llega_hoy si no está ya ocupada
        if (num && !movimientos[num]) movimientos[num] = 'llega_hoy'
      })
    })

    return movimientos
  } catch (e) {
    return movimientos
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const hoy = new Date().toISOString().slice(0, 10)

    // ── POST: actualizar estado manual de una habitación ──
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { habitacionId, estado } = body

      const estados = await kvGet('habitaciones_estados') || {}
      estados[habitacionId] = { estado, fecha: hoy, manual: true, actualizado: new Date().toISOString() }
      await kvSet('habitaciones_estados', estados)

      return res.status(200).json({ ok: true })
    }

    // ── GET: devolver las 25 habitaciones con su estado + movimiento ──
    const [estadosGuardados, movimientos] = await Promise.all([
      kvGet('habitaciones_estados'),
      getMovimientosCloudbeds()
    ])

    const estados = estadosGuardados || {}

    const habitaciones = HABITACIONES.map(h => {
      const guardado = estados[h.id]
      const movimiento = movimientos[h.id] || 'libre'

      // El estatus de limpieza: si hay uno manual de HOY, respétalo.
      // Si no, el estatus por defecto depende del movimiento.
      let estado
      if (guardado && guardado.fecha === hoy && guardado.manual) {
        estado = guardado.estado // respeta lo que marcó el equipo hoy
      } else {
        // Estado inicial automático del día
        if (movimiento === 'ocupada' || movimiento === 'sale_hoy') estado = 'ocupada'
        else estado = 'limpia' // libre o llega_hoy → asumimos limpia hasta que digan lo contrario
      }

      return { ...h, estado, movimiento }
    })

    return res.status(200).json({ habitaciones, fecha: hoy })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
