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
  } catch (e) { return null }
}

async function kvSet(key, value) {
  const encoded = encodeURIComponent(JSON.stringify(value))
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
}

const TAREAS = {
  manana: {
    label: 'Turno Mañana',
    hora: '6:00am – 2:30pm',
    emoji: '🌅',
    departamentos: {
      front: {
        label: 'Front Desk',
        tareas: [
          'Leer libro de novedades del turno noche',
          'Revisar llegadas del día en Cloudbeds',
          'Preparar llaves y welcome amenities para check-ins',
          'Verificar aromaterapia y Ochibori en recepción',
          'Confirmar reservas de spa del día con equipo Siana',
          'Revisar estado de habitaciones con Housekeeping',
          'Ejecutar check-outs con encuesta de satisfacción',
          'Supervisar limpieza de habitaciones liberadas',
          'Ejecutar check-ins con protocolo wellness',
          'Briefing de traspaso con turno tarde',
          'Registrar novedades del turno en la app',
        ]
      },
      housekeeping: {
        label: 'Housekeeping',
        tareas: [
          'Briefing con líder Marcela — asignar habitaciones',
          'Priorizar limpieza de habitaciones con check-out',
          'Revisar y reponer minibares de habitaciones ocupadas',
          'Inspección de amenities en todas las habitaciones',
          'Actualizar estado de habitaciones en la app',
          'Revisar inventario de lencería y amenities',
          'Reportar cualquier daño o mantenimiento necesario',
        ]
      },
      spa: {
        label: 'Spa (Siana)',
        tareas: [
          'Revisar agenda de citas del día',
          'Preparar cabinas para primeras sesiones',
          'Verificar inventario de productos spa',
          'Confirmar reservas y posibles cancelaciones',
          'Preparar aromaterapia para check-ins del día',
        ]
      },
      mantenimiento: {
        label: 'Mantenimiento',
        tareas: [
          'Inspección matutina de equipos y sistemas',
          'Revisar A/C de habitaciones reportadas',
          'Atender solicitudes pendientes del turno noche',
          'Verificar funcionamiento de ascensores',
          'Revisar sistemas de iluminación áreas comunes',
        ]
      }
    }
  },
  tarde: {
    label: 'Turno Tarde',
    hora: '1:30pm – 10:00pm',
    emoji: '☀️',
    departamentos: {
      front: {
        label: 'Front Desk',
        tareas: [
          'Leer novedades del turno mañana',
          'Revisar llegadas pendientes del día',
          'Ejecutar check-ins con protocolo wellness completo',
          'Coordinar con spa — seguimiento reservas tarde',
          'Supervisar apertura de terraza con equipo F&B',
          'Atender solicitudes de huéspedes en casa',
          'Gestionar solicitudes de late check-out para mañana',
          'Confirmar llegadas del día siguiente',
          'Cierre parcial de caja del día',
          'Briefing de traspaso con turno noche',
          'Registrar novedades del turno en la app',
        ]
      },
      terraza: {
        label: 'The Terrace',
        tareas: [
          'Mise en place completo de terraza',
          'Verificar inventario de cocina e insumos',
          'Confirmar reservas y eventos del día',
          'Briefing de equipo cocina y servicio',
          'Verificar montaje de mesas',
          'Cierre de caja de terraza',
          'Limpieza y organización al cierre',
        ]
      },
      spa: {
        label: 'Spa (Siana)',
        tareas: [
          'Revisar agenda de citas tarde y noche',
          'Preparar cabinas para sesiones vespertinas',
          'Confirmar citas del día siguiente',
          'Cierre de caja spa',
          'Limpieza y desinfección de cabinas al cierre',
        ]
      },
      host: {
        label: 'Host & Concierge',
        tareas: [
          'Revisar novedades y solicitudes de huéspedes',
          'Coordinar experiencias especiales programadas',
          'Gestionar comunicaciones con huéspedes in-house',
          'Actualizar perfil de huéspedes con preferencias',
          'Coordinar transportes y reservas externas',
        ]
      }
    }
  },
  noche: {
    label: 'Turno Noche',
    hora: '10:00pm – 6:00am',
    emoji: '🌙',
    departamentos: {
      front: {
        label: 'Front Desk',
        tareas: [
          'Leer novedades del turno tarde',
          'Verificar huéspedes en casa y habitaciones',
          'Confirmar llegadas tardías esperadas',
          'Revisar alarmas y seguridad del edificio',
          'Atender llegadas tardías con protocolo nocturno',
          'Cierre de caja diario completo',
          'Preparar reporte de ocupación del día',
          'Preparar pre-check-in para llegadas de mañana',
          'Preparar Ochibori y aromaterapia para turno mañana',
          'Rondas de seguridad cada 2 horas',
          'Verificar sistemas: wifi, A/C, iluminación',
          'Briefing de traspaso con turno mañana',
          'Registrar novedades del turno en la app',
        ]
      },
      mantenimiento: {
        label: 'Mantenimiento',
        tareas: [
          'Inspección nocturna de sistemas',
          'Atender emergencias de mantenimiento',
          'Verificar sistemas de seguridad',
          'Revisar calderas y sistemas de agua caliente',
        ]
      }
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

    const today = new Date().toISOString().split('T')[0]

    if (req.method === 'GET') {
      const { turno } = req.query
      const key = `checklist_${turno}_${today}`
      const completadas = await kvGet(key) || {}
      return res.status(200).json({ tareas: TAREAS[turno] || {}, completadas, fecha: today })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { turno, departamento, tareaIndex, completada, empleado } = body
      const key = `checklist_${turno}_${today}`
      const completadas = await kvGet(key) || {}
      const tareaKey = `${departamento}_${tareaIndex}`
      if (completada) {
        completadas[tareaKey] = { completada: true, empleado, hora: new Date().toISOString() }
      } else {
        delete completadas[tareaKey]
      }
      await kvSet(key, completadas)
      return res.status(200).json({ ok: true })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
