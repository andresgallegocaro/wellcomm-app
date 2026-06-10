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

// Equipos por área (un solo lugar manda)
const FRONT_EMPLEADOS = ['Rafa', 'Carlos', 'Kate', 'Estefanía']
const HOUSEKEEPING_EMPLEADOS = ['Marcela', 'Hilda', 'Johana']
const MANTENIMIENTO_EMPLEADOS = ['Jhonatan', 'Externo']
const SPA_EMPLEADOS = ['Amalia', 'Valentina', 'Catalina', 'Leidy']

// Apertura y relevo: común a los tres turnos (Sección 3.1 del Playbook)
const FRONT_APERTURA = [
  'Recibir el relevo cara a cara con el turno saliente: leer y firmar las novedades, repasar llegadas, salidas y pendientes abiertos',
  'Recibir el fondo de caja de $300.000 COP — contar el dinero al recibirlo y dejar constancia',
  'Recorrido sensorial del lobby: música de marca al volumen correcto, aroma WELLCOMM, A/C a 22°C automático, iluminación adecuada al momento del día',
  'Asegurar el escritorio impecable y provisto: papel en impresoras, llaves, bolígrafos, tarjetas de bienvenida y de registro, papelería para notas a mano',
  'Verificar la estación de Welcomedrinks: limpia y lista (6 vasos + agua con naranja, pepino, menta e hielo); reponer si hace falta',
  'Revisar el back-of-house: storage de equipaje ordenado, zona de detalles y amenities surtida (café colombiano, dulces locales, tarjetería)',
  'Revisar e-mail, WhatsApp y chats de las OTAs; responder en menos de 5 minutos',
  'Atender reservas y tomar comentarios o inquietudes por chat, e-mail o teléfono',
]

const TAREAS = {
  manana: {
    label: 'Turno Mañana', hora: '6:00am – 2:30pm', emoji: '🌅',
    puestos: {
      front: {
        label: 'Front Desk', emoji: '🏨',
        empleados: FRONT_EMPLEADOS,
        tareas: [
          ...FRONT_APERTURA,
          'Revisar las llegadas del día: confirmar tipo de habitación, horarios estimados y peticiones especiales en el PMS',
          'Escribir a mano las notas de bienvenida del día y preparar el amenity de cada llegada (café colombiano + nota a mano); personalizar según el perfil',
          'Identificar cumpleaños, aniversarios, lunas de miel o huéspedes recurrentes entre las llegadas y preparar el detalle WOW correspondiente',
          'Verificar los check-outs del día: hacer la lista e imprimir los saldos pendientes por pagar',
          'Confirmar que el recordatorio automático de check-out (Booking) se envió a las salidas del día; si falta alguno, gestionarlo manualmente a una hora prudente',
          'Coordinar con Housekeeping el estado y la priorización de habitaciones: salidas, early check-in y cuartos con atención especial',
          'Recopilar y reportar las observaciones de los Invitados que afecten a Mantenimiento o Limpieza, dejándolas registradas y canalizadas',
          'Verificar llaves, tarjetas de bienvenida y de registro para los Invitados que llegan',
          'Chequear comentarios y notas de recepción; resolver cualquier falla pendiente del turno anterior',
          'Mantener el lobby y la estación de Welcomedrinks impecables durante todo el turno',
          'Actualizar el archivo de novedades de turno antes del relevo',
        ]
      },
      housekeeping: {
        label: 'Housekeeping', emoji: '🧹',
        empleados: HOUSEKEEPING_EMPLEADOS,
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
        empleados: MANTENIMIENTO_EMPLEADOS,
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
        empleados: SPA_EMPLEADOS,
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
        empleados: FRONT_EMPLEADOS,
        tareas: [
          ...FRONT_APERTURA,
          'Verificar que no existan salidas pendientes en el sistema',
          'Confirmar que cada llegada prevista tenga su habitación lista, su amenity (café + nota a mano) y su personalización antes del check-in',
          'Escribir a mano cualquier nota de bienvenida pendiente para las llegadas de la tarde-noche',
          'Recibir y ejecutar los check-in de la tarde con la secuencia de servicio de lujo completa',
          'Actualizar y resolver fallas o quejas pendientes; dar seguimiento a las observaciones canalizadas a Mantenimiento y Limpieza',
          'Recopilar nuevas observaciones de los Invitados que afecten a Mantenimiento o Limpieza y reportarlas',
          'Coordinar con Mantenimiento el estado de las habitaciones (17:00)',
          'Verificar llaves, tarjetas de bienvenida y de registro para los Invitados que llegan',
          'Cuidar el ambiente del lobby en la transición al atardecer: ajustar iluminación, música y aroma al momento del día',
          'Dejar el lobby, la estación de Welcomedrinks y el escritorio impecables para el turno siguiente',
          'Actualizar el archivo de novedades de turno',
          'Imprimir el cierre de turno desde el PMS, cuadrarlo con el Excel del Drive, imprimirlo y guardarlo en la caja para Contabilidad',
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
        empleados: SPA_EMPLEADOS,
        tareas: [
          'Revisar agenda de citas de tarde',
          'Preparar cabinas para sesiones vespertinas',
          'Confirmar citas del día siguiente',
          'Gestionar ventas de productos spa',
          'Cierre de caja Siana',
          'Limpieza y desinfección completa de cabinas al cierre',
          'Registrar novedades del turno',
        ]
      }
    }
  },
  noche: {
    label: 'Turno Noche', hora: '10:00pm – 6:00am', emoji: '🌙',
    puestos: {
      front: {
        label: 'Front Desk — Auditoría Nocturna', emoji: '🏨',
        empleados: FRONT_EMPLEADOS,
        tareas: [
          ...FRONT_APERTURA,
          'Verificar que no existan salidas pendientes en el sistema',
          'Actualizar y resolver fallas o quejas pendientes; consolidar las observaciones del día para Mantenimiento y Limpieza',
          'Cerrar el datáfono a las 23:50',
          'Asignar y pre-bloquear las habitaciones de las llegadas del día siguiente, según preferencias, peticiones y categoría reservada',
          'Generar llaves, tarjetas de bienvenida y de registro para los Invitados que llegan al día siguiente',
          'Preparar la papelería para que el turno de la mañana escriba las notas de bienvenida a mano sin contratiempos',
          'Auditar en el PMS que TODAS las reservas estén correctas: datos completos, documentos subidos, sin saldos pendientes; registrar cada ítem a corregir en el Word del Drive (habitación + novedad) y dejarlo corregido',
          'Diligenciar el seguimiento de ventas diarias desde el panel del PMS (04:00–05:00)',
          'Revisar las reservas próximas (15 días) en las OTAs y ofrecerles el servicio de transporte',
          'Dejar el lobby, la música, la iluminación y el aroma listos para el primer Invitado del amanecer',
          'Actualizar el archivo de novedades de turno',
          'Imprimir el cierre de turno desde Cloudbeds, cuadrarlo con el Excel del Drive, imprimirlo y guardarlo en la caja para Contabilidad',
        ]
      },
      mantenimiento: {
        label: 'Mantenimiento', emoji: '🔧',
        empleados: MANTENIMIENTO_EMPLEADOS,
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
