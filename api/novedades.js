const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
  const data = await res.json()
  return data.result ? JSON.parse(data.result) : null
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value) })
  })
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()

    // GET — obtener novedades
    if (req.method === 'GET') {
      const novedades = await kvGet('novedades') || []
      return res.status(200).json({ novedades })
    }

    // POST — crear novedad
    if (req.method === 'POST') {
      const { texto, empleado, departamento, turno, prioridad } = req.body
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
      // Guardar solo las últimas 100
      await kvSet('novedades', novedades.slice(0, 100))
      return res.status(200).json({ ok: true, novedad: nueva })
    }

    // DELETE — marcar como leída
    if (req.method === 'DELETE') {
      const { id } = req.body
      const novedades = await kvGet('novedades') || []
      const actualizadas = novedades.map(n => n.id === id ? { ...n, leida: true } : n)
      await kvSet('novedades', actualizadas)
      return res.status(200).json({ ok: true })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
