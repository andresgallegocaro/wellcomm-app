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
    label: 'Turno Mañana', hora: '6:00am – 2:30pm', emoji: '🌅',
    puestos: {
      front: {
        label: 'Front Desk', emoji: '🏨',
        empleados: ['Yury', 'Fabian', 'Alex', 'Rafael'],
        tareas: [
          'Leer libro de novedades del turno noche',
          'Revisar llegadas del día en Cloudbeds con perfil de cada huésped',
          'Preparar llaves y sobre de bienvenida para check-ins',
          'Activar aromaterapia en recepción (lavanda o cítricos)',
          'Preparar Ochibori para recibimiento de huéspedes',
          'Confirmar reservas de spa del día con equipo Siana',
          'Verificar estado de habitaciones con Marcela (Housekeeping)',
          'Revisar reporte de ocupación vs tarifa recomendada PricePoint',
          'Ejecutar check-outs con encuesta de satisfacción verbal',
          'Actualizar estado de habitaciones en la app tras cada salida',
          'Ejecutar check-ins con protocolo wellness completo',
          'Registrar preferencias detectadas en perfil del huésped',
          'Briefing de traspaso con turno tarde — verbal + novedades en app',
        ]
      },
      housekeeping: {
        label: 'Housekeeping', emoji: '🧹',
        empleados: ['Raisa', 'Beatriz', 'Aracelly', 'Carolina', 'Marcela'],
        tareas: [
          'Briefing con Marcela — asignación de habitaciones por prioridad',
          'Priorizar limpieza de habitaciones con check-out',
          'Inspección de habitaciones liberadas antes de marcarlas limpias',
          'Reponer minibar completo en habitaciones de check-out',
          'Revisar y reponer amenities (jabón, shampoo, aromaterapia)',
          'Cambio completo de lencería en check-outs',
          'Revisar lencería de habitaciones ocupadas (+2 noches: cambio parcial)',
          'Reportar daños o mantenimiento necesario en la app',
          'Actualizar estado de cada habitación en la app al terminar',
          'Inventario de lencería y amenities al cierre del turno',
        ]
      },
      mantenimiento: {
        label: 'Mantenimiento', emoji: '🔧',
        empleados: ['Andrés', 'Jhonatan'],
        tareas: [
          'Inspección matutina de equipos: A/C, ascensores, iluminación',
          'Revisar A/C de habitaciones con check-in del día',
          'Atender solicitudes pendientes del turno noche',
          'Revisión de plomería en habitaciones reportadas',
          'Inspección de terraza — mobiliario, iluminación, estructura',
          'Verificar funcionamiento de wifi en todas las plantas',
          'Registrar trabajos realizados en libro de novedades',
        ]
      },
      spa: {
        label: 'Spa — Siana', emoji: '💆',
        empleados: ['Ana', 'Catalina', 'Rosmery', 'Amalia'],
        tareas: [
          'Revisar agenda de citas del día completa',
          'Preparar cabinas para primeras sesiones',
          'Verificar inventario de aceites, velas y productos',
          'Confirmar citas y gestionar posibles cancelaciones',
          'Preparar kit de aromaterapia para check-ins del hotel',
          'Limpiar y desinfectar cabinas entre sesión y sesión',
          'Registrar ventas y servicios en Siana',
        ]
      }
    }
  },
  tarde: {
    label: 'Turno Tarde', hora: '1:30pm – 10:00pm', emoji: '☀️',
    puestos: {
      front: {
        label: 'Front Desk', emoji: '🏨',
        empleados: ['Yury', 'Fabian', 'Alex', 'Rafael'],
        tareas: [
          'Leer novedades del turno mañana',
          'Revisar llegadas pendientes del día',
          'Ejecutar check-ins con protocolo wellness completo',
          'Actualizar estado de habitaciones post check-in',
          'Coordinar con spa — seguimiento reservas de tarde',
          'Supervisar apertura de terraza con equipo F&B',
          'Atender solicitudes de huéspedes en casa',
          'Gestionar solicitudes de late check-out para mañana',
          'Confirmar llegadas del día siguiente — revisar notas especiales',
          'Cierre parcial de caja del día',
          'Briefing de traspaso con turno noche — verbal + novedades en app',
        ]
      },
      terraza_cocina: {
        label: 'The Terrace — Cocina', emoji: '🍕',
        empleados: ['Ivan', 'Mateo', 'Carlos'],
        tareas: [
          'Recepción y verificación de insumos del día',
          'Mise en place completo de cocina',
          'Preparar masas y bases para pizzas del servicio',
          'Verificar temperaturas de equipos de frío',
          'Briefing con equipo de servicio — menú del día y especiales',
          'Servicio completo de cocina',
          'Limpieza profunda de cocina al cierre',
          'Inventario de insumos y reporte de faltantes',
        ]
      },
      terraza_servicio: {
        label: 'The Terrace — Servicio', emoji: '🍽️',
        empleados: ['Libardo', 'Yeizon', 'Ana Maria', 'Maykol', 'Emily'],
        tareas: [
          'Montaje completo de terraza — mesas, mantelería, velas',
          'Verificar mise en place de barra',
          'Briefing con cocina — menú y especiales del día',
          'Revisar reservas de terraza del día',
          'Servicio completo a mesas y barra',
          'Gestionar solicitudes de room service',
          'Cierre de caja de terraza',
          'Desmontaje y limpieza de terraza al cierre',
        ]
      },
      spa: {
        label: 'Spa — Siana', emoji: '💆',
        empleados: ['Ana', 'Catalina', 'Rosmery', 'Amalia'],
        tareas: [
          'Revisar agenda de citas de tarde',
          'Preparar cabinas para sesiones vespertinas',
          'Confirmar citas del día siguiente',
          'Gestionar ventas de productos spa',
          'Cierre de caja Siana',
          'Limpieza y desinfección completa de cabinas al cierre',
          'Registrar novedades del turno',
        ]
      },
      host: {
        label: 'Host & Concierge', emoji: '🤝',
        empleados: ['Jose'],
        tareas: [
          'Revisar novedades y solicitudes activas de huéspedes',
          'Coordinar experiencias especiales programadas',
          'Gestionar comunicaciones con huéspedes in-house',
          'Actualizar perfil de huéspedes con preferencias detectadas',
          'Coordinar transportes y reservas en restaurantes externos',
          'Gestionar reseñas y feedback en tiempo real',
          'Apoyar en check-ins especiales o VIPs',
        ]
      }
    }
  },
  noche: {
    label: 'Turno Noche', hora: '10:00pm – 6:00am', emoji: '🌙',
    puestos: {
      front: {
        label: 'Front Desk', emoji: '🏨',
        empleados: ['Oscar', 'Fabian', 'Alex'],
        tareas: [
          'Leer novedades del turno tarde',
          'Verificar lista de huéspedes en casa y estado de habitaciones',
          'Confirmar llegadas tardías esperadas con hora estimada',
          'Revisar sistema de alarmas y seguridad del edificio',
          'Atender llegadas tardías con protocolo nocturno',
          'Cierre de caja diario completo',
          'Preparar reporte de ocupación del día',
          'Pre-check-in de todas las llegadas del día siguiente',
          'Preparar Ochibori y aromaterapia para turno mañana',
          'Ronda de seguridad piso por piso — cada 2 horas',
          'Verificar sistemas: wifi, A/C áreas comunes, iluminación',
          'Reporte nocturno completo en libro de novedades',
          'Briefing de traspaso con turno mañana',
        ]
      },
      mantenimiento: {
        label: 'Mantenimiento', emoji: '🔧',
        empleados: ['Andrés', 'Jhonatan'],
        tareas: [
          'Inspección nocturna de sistemas eléctricos',
          'Verificar sistema de agua caliente y calderas',
          'Atender emergencias de mantenimiento nocturnas',
          'Revisar iluminación de emergencia',
          'Registrar novedades en app',
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
      const { turno, puesto, tareaIndex, completada, empleado } = body
      const key = `checklist_${turno}_${today}`
      const completadas = await kvGet(key) || {}
      const tareaKey = `${puesto}_${tareaIndex}`
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
