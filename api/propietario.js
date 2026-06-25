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

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const PROPIETARIOS = {
  '0001': { nombre: 'Propietario 1', pin: '1111' },
  '0002': { nombre: 'Propietario 2', pin: '2222' },
  '0003': { nombre: 'Propietario 3', pin: '3333' },
}

const CATEGORIAS = ['F&B', 'Spa', 'Habitaciones', 'Mantenimiento', 'Legal', 'Servicios', 'Nómina', 'Marketing', 'Otros']
const ESTADOS_VALIDOS = ['checked_in', 'checked_out', 'confirmed']

// ============================================================
// PLANTILLA DE GASTOS — semilla con valores reales de MAYO 2026
// (extraídos del balance Siigo). Estructura: categorías madre
// con líneas editables. Cada mes nuevo arranca copiando el mes
// anterior guardado; si no hay, usa esta plantilla.
// ============================================================
const PLANTILLA_GASTOS = [
  {
    id: 'nomina', label: 'Nómina y personal', emoji: '👥',
    lineas: [
      { id: 'nom1', label: 'Sueldos', valor: 52496268 },
      { id: 'nom2', label: 'Horas extras y recargos', valor: 7705515 },
      { id: 'nom3', label: 'Auxilio de transporte', valor: 5239298 },
      { id: 'nom4', label: 'Incapacidades', valor: 509100 },
      { id: 'nom5', label: 'Bonificaciones', valor: 300000 },
      { id: 'nom6', label: 'Cesantías', valor: 5844753 },
      { id: 'nom7', label: 'Intereses sobre cesantías', valor: 701371 },
      { id: 'nom8', label: 'Prima de servicios', valor: 5844753 },
      { id: 'nom9', label: 'Vacaciones', valor: 6532238 },
      { id: 'nom10', label: 'Aportes ARL', valor: 694906 },
      { id: 'nom11', label: 'Aportes pensión', valor: 7192362 },
      { id: 'nom12', label: 'Aportes caja de compensación', valor: 2613159 },
      { id: 'nom13', label: 'Aportes EPS', valor: 2335 },
      { id: 'nom14', label: 'Gastos médicos y drogas', valor: 641300 },
      { id: 'nom15', label: 'Bienestar y atención a empleados', valor: 234800 },
    ]
  },
  {
    id: 'honorarios', label: 'Honorarios y asesorías', emoji: '📐',
    lineas: [
      { id: 'hon1', label: 'Asesoría jurídica', valor: 1750905 },
      { id: 'hon2', label: 'Asesoría comercial (RevenueClick)', valor: 3208333 },
      { id: 'hon3', label: 'Asesoría SST y RRHH', valor: 2860000 },
      { id: 'hon4', label: 'Asesoría Spa', valor: 3040440 },
    ]
  },
  {
    id: 'impuestos', label: 'Impuestos', emoji: '🏛️',
    lineas: [
      { id: 'imp1', label: 'Industria y comercio (ICA)', valor: 1386452 },
      { id: 'imp2', label: 'Impuesto predial', valor: 1478703 },
      { id: 'imp3', label: 'AIU', valor: 192404 },
      { id: 'imp4', label: 'Otros impuestos asumidos', valor: 120000 },
    ]
  },
  {
    id: 'contrib_seguros', label: 'Contribuciones y seguros', emoji: '🛡️',
    lineas: [
      { id: 'cs1', label: 'Contribuciones (Barrio Manila, Fontur)', valor: 624161 },
      { id: 'cs2', label: 'Seguro todo riesgo', valor: 3526258 },
    ]
  },
  {
    id: 'servicios_publicos', label: 'Servicios públicos', emoji: '⚡',
    lineas: [
      { id: 'sp1', label: 'Energía eléctrica', valor: 14696499 },
      { id: 'sp2', label: 'Acueducto', valor: 3536146 },
      { id: 'sp3', label: 'Gas', valor: 3830737 },
      { id: 'sp4', label: 'Alumbrado público', valor: 637931 },
      { id: 'sp5', label: 'Tasa de aseo', valor: 183867 },
      { id: 'sp6', label: 'Internet', valor: 2921464 },
    ]
  },
  {
    id: 'servicios_operativos', label: 'Servicios operativos', emoji: '🧰',
    lineas: [
      { id: 'so1', label: 'Aseo y vigilancia', valor: 181700 },
      { id: 'so2', label: 'Temporales', valor: 2154042 },
      { id: 'so3', label: 'Procesamiento de datos (software)', valor: 8008562 },
      { id: 'so4', label: 'Transporte, fletes y acarreos', valor: 14000 },
    ]
  },
  {
    id: 'mantenimiento', label: 'Mantenimiento y reparaciones', emoji: '🔧',
    lineas: [
      { id: 'mn1', label: 'Mantenimiento piscinas', valor: 579723 },
      { id: 'mn2', label: 'Mantenimiento ascensores', valor: 554484 },
      { id: 'mn3', label: 'Mantenimiento aire acondicionado', valor: 345700 },
      { id: 'mn4', label: 'Mantenimiento motobombas', valor: 2300000 },
      { id: 'mn5', label: 'Construcciones y edificaciones', valor: 252017 },
      { id: 'mn6', label: 'Gastos de ferretería', valor: 83431 },
      { id: 'mn7', label: 'Arreglos ornamentales', valor: 240000 },
    ]
  },
  {
    id: 'comisiones', label: 'Comisiones y financieros', emoji: '💳',
    lineas: [
      { id: 'cm1', label: 'Comisiones OTAs (Booking, Expedia)', valor: 21146561 },
      { id: 'cm2', label: 'Comisiones (Alianza Fiduciaria)', valor: 1750905 },
      { id: 'cm3', label: 'Comisiones bancarias', valor: 5076246 },
      { id: 'cm4', label: 'Impuesto 4x1.000', valor: 394954 },
      { id: 'cm5', label: 'Impuesto 4x1.000 no deducible', valor: 394954 },
      { id: 'cm6', label: 'Cuota de manejo bancaria', valor: 89080 },
      { id: 'cm7', label: 'Intereses corrientes', valor: 205442 },
    ]
  },
  {
    id: 'marketing', label: 'Marketing', emoji: '📣',
    lineas: [
      { id: 'mk1', label: 'Marketing corporativo', valor: 16962484 },
      { id: 'mk2', label: 'Relaciones e influenciadores', valor: 2984000 },
    ]
  },
  {
    id: 'costos_hotel', label: 'Costos operativos del hotel', emoji: '🏨',
    lineas: [
      { id: 'ch1', label: 'Lavandería y similares', valor: 8713017 },
      { id: 'ch2', label: 'Desayuno invitados', valor: 7548776 },
      { id: 'ch3', label: 'Lencería y decoración', valor: 2584181 },
      { id: 'ch4', label: 'PMS (software operativo)', valor: 736428 },
      { id: 'ch5', label: 'Fumigación', valor: 446408 },
      { id: 'ch6', label: 'Musicalización (Brandtrack)', valor: 309510 },
      { id: 'ch7', label: 'Lavado de alfombras y muebles', valor: 105000 },
      { id: 'ch8', label: 'Amenities', valor: 29510 },
    ]
  },
  {
    id: 'insumos', label: 'Insumos y suministros', emoji: '🧴',
    lineas: [
      { id: 'in1', label: 'Elementos de aseo y cafetería', valor: 2271757 },
      { id: 'in2', label: 'Vajilla y cristalería', valor: 1957065 },
      { id: 'in3', label: 'Útiles y papelería', valor: 314031 },
      { id: 'in4', label: 'Representación y RRPP', valor: 236790 },
      { id: 'in5', label: 'Atención al cliente', valor: 39800 },
      { id: 'in6', label: 'Taxis y buses', valor: 57100 },
      { id: 'in7', label: 'Trámites y licencias', valor: 12100 },
    ]
  },
]

// Busca el mes anterior más reciente con gastos guardados (arrastre)
async function buscarGastosPrevios(mes) {
  let [y, m] = mes.split('-').map(Number)
  for (let i = 0; i < 12; i++) {
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
    const k = `${y}-${String(m).padStart(2, '0')}`
    const g = await kvGet(`gastos_${k}`)
    if (g && Array.isArray(g.categorias)) return g
  }
  return null
}

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

async function getReservasDelMes(headers, inicio, fin) {
  let todas = []
  let pageNumber = 1
  while (pageNumber <= 10) {
    const res = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?checkInTo=${fin}&checkOutFrom=${inicio}&pageSize=100&pageNumber=${pageNumber}`,
      { headers }
    )
    const lista = normalizar(await res.json())
    todas = todas.concat(lista)
    if (lista.length < 100) break
    pageNumber++
  }
  return todas
}

async function traerDetallesEnLotes(reservas, headers, tamLote = 15, pausaMs = 250) {
  const resultados = []
  for (let i = 0; i < reservas.length; i += tamLote) {
    const lote = reservas.slice(i, i + tamLote)
    const detallesLote = await Promise.all(
      lote.map(async r => {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          return (await dr.json())?.data || null
        } catch { return null }
      })
    )
    resultados.push(...detallesLote)
    if (i + tamLote < reservas.length) await sleep(pausaMs)
  }
  return resultados
}

async function getCloudbedsData(mes) {
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  const [year, month] = mes.split('-')
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const inicio = `${mes}-01`
  const fin = `${mes}-${String(lastDay).padStart(2, '0')}`

  try {
    const lista = await getReservasDelMes(headers, inicio, fin)
    const detalles = await traerDetallesEnLotes(lista, headers)

    let ingresosMes = 0
    let nochesMes = 0
    const canales = {}

    detalles.forEach(d => {
      if (!d) return
      if (!ESTADOS_VALIDOS.includes(d.status)) return

      const asignadas = d.assigned || []
      let revestaMes = 0
      asignadas.forEach(a => {
        (a.dailyRates || []).forEach(dr => {
          if (dr.date >= inicio && dr.date <= fin) {
            revestaMes += parseFloat(dr.rate || 0)
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
    const revpar = totalNochesDisp > 0 ? Math.round(ingresosMes / totalNochesDisp) : 0

    const enCasaRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers })
    const enCasaLista = normalizar(await enCasaRes.json())
    const detallesEnCasa = await traerDetallesEnLotes(enCasaLista, headers)

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
    return { ingresosMes: 0, noches: 0, adr: 0, ocupacion: 0, revpar: 0, enCasa: 0, totalReservas: 0, canales: {}, reservasActuales: [], error: e.message }
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

    if (req.method === 'POST' && body.action === 'leer_lote') {
      const proveedores = await getProveedores()
      const archivos = body.archivos || []
      const resultados = []
      for (let i = 0; i < archivos.length; i += 3) {
        const lote = archivos.slice(i, i + 3)
        const datosLote = await Promise.all(
          lote.map(async a => {
            try {
              const datos = await leerReciboPDF(a.pdfBase64, proveedores)
              return { nombre: a.nombre, ...datos }
            } catch {
              return { nombre: a.nombre, proveedor: '', importe: 0, fecha: '', concepto: 'Error al leer', categoria: 'Otros', proveedorConocido: false }
            }
          })
        )
        resultados.push(...datosLote)
      }
      return res.status(200).json({ ok: true, resultados, totalProveedores: proveedores.length })
    }

    if (req.method === 'POST' && body.action === 'guardar_recibo') {
      const { mes, recibo } = body
      const recibos = await kvGet(`recibos_${mes}`) || []
      recibos.push({ id: Date.now(), ...recibo, creado: new Date().toISOString() })
      await kvSet(`recibos_${mes}`, recibos)
      return res.status(200).json({ ok: true, recibos })
    }

    if (req.method === 'POST' && body.action === 'guardar_lote') {
      const { mes, recibos: nuevos } = body
      const recibos = await kvGet(`recibos_${mes}`) || []
      const conId = nuevos.map((r, idx) => ({ id: Date.now() + idx, ...r, creado: new Date().toISOString() }))
      const todos = [...recibos, ...conId]
      await kvSet(`recibos_${mes}`, todos)
      return res.status(200).json({ ok: true, recibos: todos })
    }

    if (req.method === 'POST' && body.action === 'editar_recibo') {
      const { mes, id, cambios } = body
      const recibos = await kvGet(`recibos_${mes}`) || []
      const actualizados = recibos.map(r =>
        r.id === id
          ? { ...r, ...cambios, importe: Number(cambios.importe) || 0, editado: new Date().toISOString() }
          : r
      )
      await kvSet(`recibos_${mes}`, actualizados)
      return res.status(200).json({ ok: true, recibos: actualizados })
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

      // Modelo de categorías + arrastre mensual
      let gastos
      if (gastosGuardados && Array.isArray(gastosGuardados.categorias)) {
        gastos = gastosGuardados
      } else {
        const prev = await buscarGastosPrevios(mes)
        const baseCategorias = (prev && Array.isArray(prev.categorias))
          ? JSON.parse(JSON.stringify(prev.categorias))
          : JSON.parse(JSON.stringify(PLANTILLA_GASTOS))
        const ingresosBase = (gastosGuardados && gastosGuardados.ingresos)
          ? gastosGuardados.ingresos
          : { habitaciones: 0, terraza: 0, spa: 0, upselling: 0, otrosIngresos: 0 }
        gastos = { ingresos: ingresosBase, categorias: baseCategorias }
      }
      if (!gastos.ingresos) gastos.ingresos = { habitaciones: 0, terraza: 0, spa: 0, upselling: 0, otrosIngresos: 0 }
      gastos.ingresos.habitaciones = cloudbeds.ingresosMes
      ;['terraza', 'spa', 'upselling', 'otrosIngresos'].forEach(f => { if (gastos.ingresos[f] === undefined) gastos.ingresos[f] = 0 })

      const recibosLista = recibos || []
      const gastosPorCategoria = {}
      CATEGORIAS.forEach(c => { gastosPorCategoria[c] = 0 })
      let totalRecibos = 0
      recibosLista.forEach(r => {
        const imp = Number(r.importe) || 0
        gastosPorCategoria[r.categoria] = (gastosPorCategoria[r.categoria] || 0) + imp
        totalRecibos += imp
      })

      const categoriasResumen = (gastos.categorias || []).map(cat => {
        const subtotal = (cat.lineas || []).reduce((a, l) => a + (Number(l.valor) || 0), 0)
        return { id: cat.id, label: cat.label, emoji: cat.emoji, subtotal }
      })
      const totalCategorias = categoriasResumen.reduce((a, c) => a + c.subtotal, 0)
      const totalGastos = totalCategorias + totalRecibos
      const totalIngresos = Object.values(gastos.ingresos).reduce((a, b) => a + (Number(b) || 0), 0)

      const GOP = totalIngresos - totalGastos
      const feeSolaraFijo = 8000000
      const feeSolaraVariable = Math.max(0, Math.round(GOP * 0.05))
      const feeSolaraTotal = feeSolaraFijo + feeSolaraVariable
      const utilidadNeta = GOP - feeSolaraTotal

      return res.status(200).json({
        mes, cloudbeds, gastos,
        recibos: recibosLista, gastosPorCategoria, totalRecibos, categorias: CATEGORIAS,
        categoriasResumen,
        resumen: {
          totalIngresos, totalCategorias, totalRecibos, totalGastos,
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
