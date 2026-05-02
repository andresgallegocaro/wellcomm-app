const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

const HABITACIONES_DEFAULT = [
  // Estándar
  { id: 'SE-302', tipo: 'Estándar', piso: 3 },
  { id: 'SE-304', tipo: 'Estándar', piso: 3 },
  { id: 'SE-305', tipo: 'Estándar', piso: 3 },
  { id: 'SE-402', tipo: 'Estándar', piso: 4 },
  { id: 'SE-404', tipo: 'Estándar', piso: 4 },
  { id: 'SE-405', tipo: 'Estándar', piso: 4 },
  { id: 'SE-502', tipo: 'Estándar', piso: 5 },
  { id: 'SE-504', tipo: 'Estándar', piso: 5 },
  { id: 'SE-505', tipo: 'Estándar', piso: 5 },
  { id: 'SE-602', tipo: 'Estándar', piso: 6 },
  { id: 'SE-604', tipo: 'Estándar', piso: 6 },
  // Superior
  { id: 'SU-301', tipo: 'Superior', piso: 3 },
  { id: 'SU-401', tipo: 'Superior', piso: 4 },
  { id: 'SU-501', tipo: 'Superior', piso: 5 },
  { id: 'SU-601', tipo: 'Superior', piso: 6 },
  // Re-Balance Suite
  { id: 'RB-303', tipo: 'Re-Balance', piso: 3 },
  { id: 'RB-403', tipo: 'Re-Balance', piso: 4 },
  { id: 'RB-503', tipo: 'Re-Balance', piso: 5 },
  { id: 'RB-603', tipo: 'Re-Balance', piso: 6 },
  // WELLcomm Suite
  { id: 'WS-306', tipo: 'WELLcomm Suite', piso: 3 },
  { id: 'WS-406', tipo: 'WELLcomm Suite', piso: 4 },
  { id: 'WS-506', tipo: 'WELLcomm Suite', piso: 5 },
  { id: 'WS-606', tipo: 'WELLcomm Suite', piso: 6 },
  // Terraza
  { id: 'TR-701', tipo: 'Terraza', piso: 7 },
  { id: 'TR-702', tipo: 'Terraza', piso: 7 },
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
  } catch (e) {
    return null
  }
}

async function kvSet(key, value) {
  const encoded = encodeURIComponent(JSON.stringify(value))
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    // GET — obtener estado de todas las habitaciones
    if (req.method === 'GET') {
      const token = process.env.CLOUDBEDS_ACCESS_TOKEN
      const today = new Date().toISOString().split('T')[0]

      // Obtener estados guardados manualmente
      const estadosGuardados = await kvGet('habitaciones_estado') || {}

      // Obtener ocupación de Cloudbeds
      let ocupadas = []
      let checkoutsHoy = []
      try {
        const [enCasaRes, salidasRes] = await Promise.all([
          fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          }),
          fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOut=${today}&pageSize=25`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          })
        ])
        const enCasaData = await enCasaRes.json()
        const salidasData = await salidasRes.json()
        ocupadas = (enCasaData?.data || []).map(r => r.roomNumber).filter(Boolean)
        checkoutsHoy = (salidasData?.data || []).map(r => r.roomNumber).filter(Boolean)
      } catch (e) {}

      // Combinar datos
      const habitaciones = HABITACIONES_DEFAULT.map(hab => {
        const estadoManual = estadosGuardados[hab.id]
        let estado = estadoManual || 'limpia'

        if (ocupadas.includes(hab.id)) {
          estado = checkoutsHoy.includes(hab.id) ? 'checkout' : 'ocupada'
        }

        return {
          ...hab,
          estado,
          estadoManual: !!estadoManual,
          huespedActual: ocupadas.includes(hab.id)
        }
      })

      return res.status(200).json({ habitaciones, actualizado: new Date().toISOString() })
    }

    // POST — actualizar estado manual
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { habitacionId, estado } = body

      const estadosGuardados = await kvGet('habitaciones_estado') || {}
      estadosGuardados[habitacionId] = estado
      await kvSet('habitaciones_estado', estadosGuardados)

      return res.status(200).json({ ok: true })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
