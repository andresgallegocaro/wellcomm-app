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

function calcNights(startDate, endDate) {
  const ms = new Date(endDate) - new Date(startDate)
  return Math.max(1, Math.round(ms / 86400000))
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

// Leer proveedores desde Notion (con cache de 10 min en KV)
async function getProveedores() {
  // Intentar cache primero
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
      const nombre = props.Proveedor?.title?.[0]?.plain_text || ''
      const categoria = props.Categoria?.select?.name || 'Otros'
      const sector = props.Sector?.rich_text?.[0]?.plain_text || ''
      return { nombre, categoria, sector }
    }).filter(p => p.nombre)

    // Guardar en cache
    await kvSet('proveedores_cache', { lista, timestamp: Date.now() })
    return lista
  } catch (e) {
    // Si Notion falla, usar cache aunque esté viejo
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
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
          },
          {
            type: 'text',
            text: `Eres el contador de WELLcomm Spa & Hotel en Medellín. Analiza este recibo o comprobante de pago (puede ser un comprobante bancario de transferencia) y extrae los datos.

BASE DE PROVEEDORES CONOCIDOS (si el beneficiario coincide o se parece a uno de estos, usa SU categoría):
${listaProveedores}

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones:
{
  "proveedor": "nombre del proveedor o beneficiario del pago",
  "importe": número entero en pesos colombianos sin puntos ni símbolos (ej: 850000),
  "fecha": "YYYY-MM-DD",
  "concepto": "descripción breve del pago",
  "categoria": "una de estas exactamente: F&B, Spa, Habitaciones, Mantenimiento, Legal, Servicios, Nómina, Marketing, Otros",
  "proveedorConocido": true si el beneficiario coincide con la base de proveedores, false si no
}

Reglas de categorización (si NO está en la base de proveedores):
- F&B: comida, bebida, insumos de cocina/bar, licores, desayunos, alimentos
- Spa: productos de spa, aromaterapia, insumos termales, terapeutas
- Habitaciones: amenities, lencería, lavandería, limpieza de habitación
- Mantenimiento: reparaciones, repuestos, técnicos, obra, ferretería
- Legal: abogados, notaría, trámites, licencias, impuestos
- Servicios: agua, luz (EPM), gas, internet, software, seguros
- Nómina: salarios, prestaciones, seguridad social
- Marketing: publicidad, redes, fotografía, diseño
- Otros: cualquier cosa que no encaje

Si en un comprobante bancario solo ves un nombre, intenta cruzarlo con la base primero. Si no coincide y no hay contexto, usa "Otros".
Si no puedes leer el importe con certeza, pon 0. Si no hay fecha clara, usa la fecha de hoy.`
          }
        ]
      }]
    })
  })

  const claudeData = await claudeRes.json()
  let texto = claudeData.content?.[0]?.text || '{}'
  texto = texto.replace(/```json/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(texto)
  } catch {
    return { proveedor: '', importe: 0, fecha: '', concepto: 'No se pudo leer', categoria: 'Otros', proveedorConocido: false }
  }
}

async function getCloudbedsData(mes) {
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  const [year, month] = mes.split('-')
  const fechaInicio = `${mes}-01`
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const fechaFin = `${mes}-${String(lastDay).padStart(2, '0')}`

  try {
    const [delMesRes, enCasaRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?checkOutFrom=${fechaInicio}&checkOutTo=${fechaFin}&pageSize=100`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
    ])

    const delMesLista = normalizar(await delMesRes.json())
    const enCasaLista = normalizar(await enCasaRes.json())

    const detalles = await Promise.all(
      delMesLista.slice(0, 60).map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          const dj = await dr.json()
          return dj?.data || null
        } catch { return null }
      })
    )

    let ingresosMes = 0
    let noches = 0
    const canales = {}
    detalles.forEach(d => {
      if (!d) return
      const total = parseFloat(d.total || 0)
      const n = calcNights(d.startDate, d.endDate)
      if (total > 0) {
        ingresosMes += total
        noches += n
        const canal = d.source || d.sourceName || 'Directo'
        canales[canal] = (canales[canal] || 0) + total
      }
    })

    const adr = noches > 0 ? Math.round(ingresosMes / noches) : 0
    const diasMes = lastDay
    const totalNochesDisp = 25 * diasMes
    const ocupacion = totalNochesDisp > 0 ? Math.round((noches / totalNochesDisp) * 100) : 0
    const revpar = Math.round((ocupacion / 100) * adr)
    const enCasa = enCasaLista.length

    const detallesEnCasa = await Promise.all(
      enCasaLista.map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          const dj = await dr.json()
          return dj?.data || null
        } catch { return null }
      })
    )

    return {
      ingresosMes: Math.round(ingresosMes),
      noches, adr, ocupacion, revpar, enCasa,
      totalReservas: delMesLista.length,
      canales,
      reservasActuales: detallesEnCasa.filter(Boolean).slice(0, 10).map(d => ({
        huesped: d.guestName || 'Huésped',
        habitacion: d.assigned?.[0]?.roomName || '—',
        checkin: d.startDate || '—',
        checkout: d.endDate || '—',
        total: parseFloat(d.total || 0),
        canal: d.source || d.sourceName || 'Directo',
        noches: calcNights(d.startDate, d.endDate),
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
