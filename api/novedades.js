const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

async function kvGet(key) {
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const data = await res.json()
    if (!data.result) return null
    let result = data.result
    if (typeof result === 'string') result = JSON.parse(result)
    if (typeof result === 'string') result = JSON.parse(result)
    return result
  } catch (e) {
    return null
  }
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(JSON.stringify(value))
  })
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    if (req.method === 'GET') {
      const novedades = await kvGet('novedades') || []
      return res.status(200).json({ novedades })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { texto, empleado, departamento, turno, prioridad } = body
      const novedades = await kvGet('novedades') || []
      const nueva = {
        id: Date.now().toString(),
        texto,
        empleado: empleado || 'Equipo',
        departamento: departamento || 'General',
        turno: turno || 'Mañana',
        prioridad: prioridad || 'normal',
        fecha: new Date().toISOString(),
        leida: false
      }
      novedades.unshift(nueva)
      await kvSet('novedades', novedades.slice(0, 100))
      return res.status(200).json({ ok: true, novedad: nueva })
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { id } = body
      const novedades = await kvGet('novedades') || []
      const actualizadas = novedades.map(n => n.id === id ? { ...n, leida: true } : n)
      await kvSet('novedades', actualizadas)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
