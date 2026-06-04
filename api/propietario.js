const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const NOTION_TOKEN = process.env.NOTION_TOKEN
const PROVEEDORES_DB_ID = '67e8ac9735f44741b8b5237f8410d2e6'

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

const PROPIETARIOS = {
  '0001': { nombre: 'Propietario 1', pin: '1111' },
  '0002': { nombre: 'Propietario 2', pin: '2222' },
  '0003': { nombre: 'Propietario 3', pin: '3333' },
}

const CATEGORIAS = ['F&B', 'Spa', 'Habitaciones', 'Mantenimiento', 'Legal', 'Servicios', 'Nómina', 'Marketing', 'Otros']
const ESTADOS_VALIDOS = ['checked_in', 'checked_out', 'confirmed']

async function getProveedores() {
  const cache = await kvGet('proveedores_cache')
  if (cache && cache.timestamp && (Date.now() - cache.timestamp < 600000)) {
    return cache.lista
  }
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${PROVEEDORES_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100 })
    })
    const data = await res.json()
    const lista = (data.results || []).map(page => {
      const props = page.properties
      return {
        nombre: props.Proveedor?.title?.[0]?.plain_text || '',
        categoria: props.Categoria?.select?.name || 'Otros',
        sector: props.Sector?.rich_text?.[0]?.plain_text || ''
      }
    }).filter(p => p.nombre)
    await kvSet('proveedores_cache', { lista, timestamp: Date.now() })
    return lista
  } catch (e) {
    return cache?.lista || []
  }
}

async function leerReciboPDF(pdfBase64, proveedores) {
  const listaProveedores = proveedores.length > 0
    ? proveedores.map(p => `- "${p.nombre}" → ${p.categoria}`).join('\n')
    : '(sin proveedores registrados aún)'

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          {
            type: 'text',
            text: `Eres el contador de WELLcomm Spa & Hotel en Medellín. Analiza este recibo o comprobante de pago y extrae los datos.

BASE DE PROVEEDORES CONOCIDOS (si el beneficiario coincide o se parece a uno de estos, usa SU categoría):
${listaProveedores}

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown:
{
  "proveedor": "nombre del proveedor o beneficiario",
  "importe": número entero en pesos colombianos sin puntos ni símbolos,
  "fecha": "YYYY-MM-DD",
  "concepto": "descripción breve",
  "categoria": "una de: F&B, Spa, Habitaciones, Mantenimiento, Legal, Servicios, Nómina, Marketing, Otros",
  "proveedorConocido": true o false
}

Reglas (si NO está en la base): F&B=comida/bebida/licores; Spa=productos spa/terapeutas; Habitaciones=amenities/lencería/lavandería; Mantenimiento=reparaciones/ferretería; Legal=abogados/notaría/impuestos; Servicios=agua/luz/gas/internet/software/seguros; Nómina=salarios/prestaciones; Marketing=publicidad/diseño; Otros=resto.
Si solo ves un nombre en un comprobante bancario, cruza con la base primero. Importe ilegible = 0. Sin fecha = hoy.`
          }
        ]
      }]
    })
  })

  const claudeData = await claudeRes.json()
  let texto = claudeData.content?.[0]?.text || '{}'
  texto = texto.replace(/```json/g, '').replace(/```/g, '').trim()
  try { return JSON.parse(texto) }
  catch { return { proveedor: '', importe: 0, fecha: '', concepto: 'No se pudo leer', categoria: 'Otros', proveedorConocido: false } }
}

// Traer TODAS las reservas que se solapan con el mes (con paginación)
async function getReservasDelMes(headers, inicio, fin) {
  let todas = []
  let pageNumber = 1
  // Traemos por check-in hasta el fin del mes, y filtramos por solape después
  while (pageNumber <= 5) {
    const res = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?checkInTo=${fin}&checkOutFrom=${inicio}&pageSize=100&pageNumber=${pageNumber}`,
      { headers }
    )
    const data = await res.json()
    const lista = normalizar(data)
    todas = todas.concat(lista)
    if (lista.length < 100) break
    pageNumber++
  }
  return todas
}

// MOTOR DE REVENUE: cuenta noche por noche dentro del mes
async function getCloudbedsData(mes) {
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  const [year, month] = mes.split('-')
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const inicio = `${mes}-01`
  const fin = `${mes}-${String(lastDay).padStart(2, '0')}`

  try {
    const lista = await getReservasDelMes(headers, inicio, fin)

    // Detalle individual de cada reserva
    const detalles = await Promise.all(
      lista.map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          return (await dr.json())?.data || null
        } catch { return null }
      })
    )

    let ingresosMes = 0
    let nochesMes = 0
    const canales = {}

    detalles.forEach(d => {
      if (!d) return
      // Excluir canceladas y no-shows
      if (!ESTADOS_VALIDOS.includes(d.status)) return

      // Recorrer dailyRates de cada habitación asignada
      const asignadas = d.assigned || []
      let revestaMes = 0
      asignadas.forEach(a => {
        (a.dailyRates || []).forEach(dr => {
          // Solo contar las noches que caen dentro del mes consultado
          if (dr.date >= inicio && dr.date <= fin) {
            const rate = parseFloat(dr.rate || 0)
            revestaMes += rate
            nochesMes += 1
          }
        })
      })

      if (revestaMes > 0) {
        ingresosMes += revestaMes
        const canal = d.source || d.sourceName || 'Directo'
        canales[canal] = (canales[canal] || 0) + revestaMes
      }
    })

    const adr = nochesMes > 0 ? Math.round(ingresosMes / nochesMes) : 0
    const totalNochesDisp = 25 * lastDay
    const ocupacion = totalNochesDisp > 0 ? Math.round((nochesMes / totalNochesDisp) * 100) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    // En casa AHORA (solo relevante para el mes en curso)
    const enCasaRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers })
    const enCasaLista = normalizar(await enCasaRes.json())
    const detallesEnCasa = await Promise.all(
      enCasaLista.map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          return (await dr.json())?.data || null
        } catch { return null }
      })
    )

    return {
      ingresosMes: Math.round(ingresosMes),
      noches: nochesMes,
      adr, ocupacion, revpar,
      enCasa: enCasaLista.length,
      totalReservas: lista.length,
      canales,
      reservasActuales: detallesEnCasa.filter(Boolean).slice(0, 10).map(d => ({
        huesped: d.guestName || 'Huésped',
        habitacion: d.assigned?.[0]?.roomName || '—',
        checkin: d.startDate || '—',
        checkout: d.endDate || '—',
        total: parseFloat(d.total || 0),
        canal: d.source || d.sourceName || 'Directo',
      }))
    }
  } catch (e) {
    return { ingresosMes: 0, noches: 0, adr: 0, ocupacion: 0, revpar: 0, enCasa: 0, totalReservas: 0, canales: {}, reservasActuales: [] }
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

    if (req.method === 'POST' && body.action === 'login') {
      const prop = Object.entries(PROPIETARIOS).find(([, p]) => p.pin === body.pin)
      if (!prop) return res.status(401).json({ error: 'PIN incorrecto' })
      return res.status(200).json({ ok: true, id: prop[0], nombre: prop[1].nombre })
    }

    if (req.method === 'POST' && body.action === 'leer_recibo') {
      const proveedores = await getProveedores()
      const datos = await leerReciboPDF(body.pdfBase64, proveedores)
      return res.status(200).json({ ok: true, datos, totalProveedores: proveedores.length })
    }

    if (req.method === 'POST' && body.action === 'guardar_recibo') {
      const { mes, recibo } = body
      const recibos = await kvGet(`recibos_${mes}`) || []
      recibos.push({ id: Date.now(), ...recibo, creado: new Date().toISOString() })
      await kvSet(`recibos_${mes}`, recibos)
      return res.status(200).json({ ok: true, recibos })
    }

    if (req.method === 'POST' && body.action === 'eliminar_recibo') {
      const { mes, id } = body
      const recibos = await kvGet(`recibos_${mes}`) || []
      const filtrados = recibos.filter(r => r.id !== id)
      await kvSet(`recibos_${mes}`, filtrados)
      return res.status(200).json({ ok: true, recibos: filtrados })
    }

    if (req.method === 'POST' && body.action === 'guardar_gastos') {
      const { mes, gastos } = body
      await kvSet(`gastos_${mes}`, gastos)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'GET') {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7)

      const [cloudbeds, gastosGuardados, recibos] = await Promise.all([
        getCloudbedsData(mes),
        kvGet(`gastos_${mes}`),
        kvGet(`recibos_${mes}`)
      ])

      const gastos = gastosGuardados || {
        fijos: { nomina: 0, arriendo: 0, serviciosPublicos: 0, internet: 0, seguros: 0, cloudbeds: 0, otrosFijos: 0 },
        variables: { amenities: 0, lavanderia: 0, desayunos: 0, comisionBooking: 0, comisionExpedia: 0, comisionAirbnb: 0, mantenimiento: 0, otrosVariables: 0 },
        ingresos: { habitaciones: cloudbeds.ingresosMes, terraza: 0, upselling: 0, otrosIngresos: 0 }
      }
      gastos.ingresos.habitaciones = cloudbeds.ingresosMes

      const recibosLista = recibos || []
      const gastosPorCategoria = {}
      CATEGORIAS.forEach(c => { gastosPorCategoria[c] = 0 })
      let totalRecibos = 0
      recibosLista.forEach(r => {
        const imp = Number(r.importe) || 0
        gastosPorCategoria[r.categoria] = (gastosPorCategoria[r.categoria] || 0) + imp
        totalRecibos += imp
      })

      const totalFijos = Object.values(gastos.fijos).reduce((a, b) => a + (Number(b) || 0), 0)
      const totalVariables = Object.values(gastos.variables).reduce((a, b) => a + (Number(b) || 0), 0)
      const totalGastos = totalFijos + totalVariables + totalRecibos
      const totalIngresos = Object.values(gastos.ingresos).reduce((a, b) => a + (Number(b) || 0), 0)

      const GOP = totalIngresos - totalGastos
      const feeSolaraFijo = 8000000
      const feeSolaraVariable = Math.max(0, Math.round(GOP * 0.05))
      const feeSolaraTotal = feeSolaraFijo + feeSolaraVariable
      const utilidadNeta = GOP - feeSolaraTotal

      return res.status(200).json({
        mes, cloudbeds, gastos,
        recibos: recibosLista, gastosPorCategoria, totalRecibos, categorias: CATEGORIAS,
        resumen: {
          totalIngresos, totalFijos, totalVariables, totalRecibos, totalGastos,
          GOP, feeSolaraFijo, feeSolaraVariable, feeSolaraTotal, utilidadNeta,
          ocupacion: cloudbeds.ocupacion, adr: cloudbeds.adr, revpar: cloudbeds.revpar,
          noches: cloudbeds.noches, totalReservas: cloudbeds.totalReservas, canales: cloudbeds.canales,
        }
      })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
