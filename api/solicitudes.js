const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    // GET — obtener solicitudes
    if (req.method === 'GET') {
      const solicitudes = await kvGet('solicitudes') || []
      return res.status(200).json({ solicitudes })
    }

    // POST — crear solicitud
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { habitacion, huesped, tipo, descripcion, origen } = body
      const solicitudes = await kvGet('solicitudes') || []

      const nueva = {
        id: Date.now().toString(),
        habitacion,
        huesped: huesped || 'Huésped',
        tipo,
        descripcion,
        origen: origen || 'equipo',
        estado: 'pendiente',
        fecha: new Date().toISOString(),
        fechaCompletado: null,
        asignadoA: null
      }

      solicitudes.unshift(nueva)
      await kvSet('solicitudes', solicitudes.slice(0, 200))
      return res.status(200).json({ ok: true, solicitud: nueva })
    }

    // PUT — actualizar estado
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { id, estado, asignadoA } = body
      const solicitudes = await kvGet('solicitudes') || []
      const actualizadas = solicitudes.map(s => s.id === id ? {
        ...s,
        estado,
        asignadoA: asignadoA || s.asignadoA,
        fechaCompletado: estado === 'completado' ? new Date().toISOString() : s.fechaCompletado
      } : s)
      await kvSet('solicitudes', actualizadas)
      return res.status(200).json({ ok: true })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
