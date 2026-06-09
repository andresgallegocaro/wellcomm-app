const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const NOTION_TOKEN = process.env.NOTION_TOKEN

// Base "Personal WELLcomm" en Notion (database ID). Configurable por env var para clonar.
const PERSONAL_DB_ID = process.env.PERSONAL_DB_ID || 'a1b75330e79a484487c62093c5ac9229'

const ESTADOS_VALIDOS = ['In-house', 'Desde casa', 'Vacaciones', 'Descanso', 'Incapacidad', 'Calamidad']

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

function ahoraColombia() {
  const now = new Date(Date.now() - 5 * 3600000)
  return now.toISOString().slice(11, 16) // HH:MM
}

function hoyColombia() {
  const now = new Date(Date.now() - 5 * 3600000)
  return now.toISOString().slice(0, 10) // YYYY-MM-DD
}

// ── Lee el personal desde Notion (caché 10 min) ──
async function getPersonal() {
  const cache = await kvGet('personal_cache')
  if (cache && cache.ts && (Date.now() - cache.ts < 10 * 60 * 1000)) {
    return cache.lista
  }
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${PERSONAL_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100 })
    })
    const data = await res.json()
    if (!data.results) return cache?.lista || []

    const lista = data.results.map(page => {
      const props = page.properties || {}
      return {
        id: page.id,
        nombre: props.Nombre?.title?.[0]?.plain_text || '',
        area: props['Área']?.select?.name || 'Sin área',
        estadoDefecto: props['Estado Hoy']?.select?.name || 'In-house',
        activo: props.Activo?.checkbox !== false,
        notas: props.Notas?.rich_text?.[0]?.plain_text || '',
      }
    }).filter(p => p.nombre && p.activo)

    await kvSet('personal_cache', { lista, ts: Date.now() })
    return lista
  } catch (e) {
    return cache?.lista || []
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

    // ── POST: cambiar estado del día de un empleado ──
    if (req.method === 'POST' && body.action === 'estado') {
      const { empleadoId, fecha, estado, usuario } = body
      const dia = fecha || hoyColombia()
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' })
      }
      const key = `personal_estado_${dia}`
      const estados = await kvGet(key) || {}
      estados[empleadoId] = {
        estado,
        autor: usuario || 'Desconocido',
        hora: ahoraColombia(),
        ts: new Date().toISOString(),
      }
      await kvSet(key, estados)
      return res.status(200).json({ ok: true })
    }

    // ── POST: refrescar caché de personal (forzar relectura de Notion) ──
    if (req.method === 'POST' && body.action === 'refrescar') {
      await kvSet('personal_cache', { lista: [], ts: 0 })
      const lista = await getPersonal()
      return res.status(200).json({ ok: true, total: lista.length })
    }

    // ── GET: personal + estado del día pedido ──
    const fecha = req.query.fecha || hoyColombia()
    const [personal, estadosDia] = await Promise.all([
      getPersonal(),
      kvGet(`personal_estado_${fecha}`),
    ])
    const estados = estadosDia || {}

    const empleados = personal.map(p => {
      const e = estados[p.id]
      return {
        ...p,
        estado: e ? e.estado : 'In-house', // por defecto in-house si no se ha marcado
        autor: e ? e.autor : null,
        hora: e ? e.hora : null,
      }
    })

    // Resumen por estado
    const resumen = {}
    ESTADOS_VALIDOS.forEach(s => { resumen[s] = 0 })
    empleados.forEach(e => { resumen[e.estado] = (resumen[e.estado] || 0) + 1 })

    return res.status(200).json({
      fecha,
      empleados,
      resumen,
      estados: ESTADOS_VALIDOS,
      total: empleados.length,
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
