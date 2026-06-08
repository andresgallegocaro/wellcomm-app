const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// Lista base de incidencias comunes de hotel (categoría → tareas)
const CATALOGO = {
  'Plomería': ['Fuga de agua', 'Inodoro dañado', 'Ducha sin presión', 'Desagüe tapado', 'Grifo goteando'],
  'Eléctrico': ['Luz fundida', 'Tomacorriente sin energía', 'Interruptor dañado', 'TV no enciende'],
  'Clima': ['A/C no enfría', 'Ruido en el A/C', 'Control de A/C perdido'],
  'Mobiliario': ['Cama/colchón dañado', 'Silla rota', 'Puerta de clóset descuadrada', 'Cajón atascado'],
  'Baño': ['Azulejo roto', 'Espejo dañado', 'Secador no funciona', 'Accesorio suelto'],
  'Cerrajería': ['Cerradura/llave dañada', 'Caja fuerte bloqueada', 'Manija suelta'],
  'General': ['Pintura/pared dañada', 'Cortina rota', 'WiFi sin señal', 'Olor persistente', 'Ventana atascada'],
}

const PRIORIDADES = ['alta', 'media', 'baja']

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
  return now.toISOString().slice(11, 16)
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const hoy = new Date().toISOString().slice(0, 10)

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // ── Reportar un nuevo daño ──
      if (body.action === 'reportar') {
        const { habitacion, categoria, descripcion, usuario } = body
        const tareas = await kvGet('mantenimiento_tareas') || []
        tareas.unshift({
          id: Date.now(),
          habitacion,
          categoria: categoria || 'General',
          descripcion,
          prioridad: null,          // sin priorizar al inicio
          estado: 'reportado',      // reportado → en_proceso → resuelto
          reportadoPor: usuario || 'Desconocido',
          reportadoFecha: hoy,
          reportadoHora: ahoraColombia(),
          resueltoPor: null,
          resueltoFecha: null,
          historial: [{ accion: 'Reportado', por: usuario || 'Desconocido', fecha: hoy, hora: ahoraColombia() }]
        })
        await kvSet('mantenimiento_tareas', tareas)
        return res.status(200).json({ ok: true, tareas })
      }

      // ── Asignar prioridad (solo dirección/líder) ──
      if (body.action === 'priorizar') {
        const { id, prioridad, usuario } = body
        const tareas = await kvGet('mantenimiento_tareas') || []
        const actualizadas = tareas.map(t => {
          if (t.id !== id) return t
          const hist = t.historial || []
          hist.push({ accion: `Prioridad: ${prioridad}`, por: usuario || 'Desconocido', fecha: hoy, hora: ahoraColombia() })
          return { ...t, prioridad, historial: hist }
        })
        await kvSet('mantenimiento_tareas', actualizadas)
        return res.status(200).json({ ok: true, tareas: actualizadas })
      }

      // ── Cambiar estado (en proceso / resuelto) ──
      if (body.action === 'estado') {
        const { id, estado, usuario } = body
        const tareas = await kvGet('mantenimiento_tareas') || []
        const actualizadas = tareas.map(t => {
          if (t.id !== id) return t
          const hist = t.historial || []
          const label = estado === 'resuelto' ? 'Resuelto' : estado === 'en_proceso' ? 'En proceso' : 'Reabierto'
          hist.push({ accion: label, por: usuario || 'Desconocido', fecha: hoy, hora: ahoraColombia() })
          return {
            ...t, estado,
            resueltoPor: estado === 'resuelto' ? (usuario || 'Desconocido') : null,
            resueltoFecha: estado === 'resuelto' ? hoy : null,
            historial: hist
          }
        })
        await kvSet('mantenimiento_tareas', actualizadas)
        return res.status(200).json({ ok: true, tareas: actualizadas })
      }

      // ── Eliminar tarea (dirección/líder) ──
      if (body.action === 'eliminar') {
        const { id } = body
        const tareas = await kvGet('mantenimiento_tareas') || []
        const filtradas = tareas.filter(t => t.id !== id)
        await kvSet('mantenimiento_tareas', filtradas)
        return res.status(200).json({ ok: true, tareas: filtradas })
      }

      return res.status(400).json({ error: 'Acción no válida' })
    }

    // ── GET: devolver todas las tareas + el catálogo ──
    const tareas = await kvGet('mantenimiento_tareas') || []
    return res.status(200).json({ tareas, catalogo: CATALOGO, prioridades: PRIORIDADES })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
