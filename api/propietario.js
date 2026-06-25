const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const NOTION_TOKEN = process.env.NOTION_TOKEN
const PROVEEDORES_DB_ID = '67e8ac9735f44741b8b5237f8410d2e6'

// === Bases de Notion: fuente única de verdad ===
const GASTOS_DB_ID = 'e409a68237844443bf910503b1736c25'
const GASTOS_DS_ID = '0ae294e6-63ee-4322-a0ec-1ed53b82a12e'
const VENTAS_DB_ID = '1c7cd1d7c7b54aceb41587fb7ff6cf5f'
const VENTAS_DS_ID = '68a25b7d-02bd-483e-b9ce-4e15889bd175'

const MESES_COL = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Metadatos de categoría (id interno + emoji) por nombre de Notion
const CAT_META = {
  'Nómina y personal': { id: 'nomina', emoji: '👥' },
  'Honorarios y asesorías': { id: 'honorarios', emoji: '📐' },
  'Impuestos': { id: 'impuestos', emoji: '🏛️' },
  'Contribuciones y seguros': { id: 'contrib_seguros', emoji: '🛡️' },
  'Servicios públicos': { id: 'servicios_publicos', emoji: '⚡' },
  'Servicios operativos': { id: 'servicios_operativos', emoji: '🧰' },
  'Mantenimiento y reparaciones': { id: 'mantenimiento', emoji: '🔧' },
  'Comisiones y financieros': { id: 'comisiones', emoji: '💳' },
  'Marketing': { id: 'marketing', emoji: '📣' },
  'Costos operativos del hotel': { id: 'costos_hotel', emoji: '🏨' },
  'Insumos y suministros': { id: 'insumos', emoji: '🧴' },
}
const ORDEN_CAT = ['nomina', 'honorarios', 'impuestos', 'contrib_seguros', 'servicios_publicos', 'servicios_operativos', 'mantenimiento', 'comisiones', 'marketing', 'costos_hotel', 'insumos']

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
// LECTURA DE NOTION — fuente única de gastos e ingresos
// Intenta el endpoint nuevo (data source) y cae al clásico (database).
// ============================================================
async function notionQueryAll(dbId, dsId) {
  const intentos = [
    { url: `https://api.notion.com/v1/data_sources/${dsId}/query`, version: '2025-09-03' },
    { url: `https://api.notion.com/v1/databases/${dbId}/query`, version: '2022-06-28' },
  ]
  for (const intento of intentos) {
    try {
      let results = []
      let cursor = undefined
      let ok = true
      for (let i = 0; i < 5; i++) {
        const body = { page_size: 100 }
        if (cursor) body.start_cursor = cursor
        const res = await fetch(intento.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': intento.version,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        if (!res.ok) { ok = false; break }
        const data = await res.json()
        results = results.concat(data.results || [])
        if (!data.has_more) break
        cursor = data.next_cursor
      }
      if (ok && results.length) return results
    } catch (e) { /* siguiente intento */ }
  }
  return []
}

function numProp(props, name) {
  const p = props[name]
  if (!p) return 0
  return Number(p.number) || 0
}
function titleProp(props, name) {
  const p = props[name]
  if (!p || !p.title) return ''
  return p.title.map(t => t.plain_text || '').join('')
}
function selectProp(props, name) {
  const p = props[name]
  if (!p || !p.select) return ''
  return p.select.name || ''
}

// Construye las categorías de gasto del mes desde la base de Notion
async function getGastosNotion(mes) {
  const mesNum = parseInt(mes.split('-')[1])
  const col = MESES_COL[mesNum]
  const filas = await notionQueryAll(GASTOS_DB_ID, GASTOS_DS_ID)
  const porCat = {}
  filas.forEach(f => {
    const props = f.properties
    const concepto = titleProp(props, 'Concepto')
    const catNombre = selectProp(props, 'Categoría')
    const orden = numProp(props, 'Orden')
    const valor = numProp(props, col)
    if (!concepto) return
    const meta = CAT_META[catNombre] || { id: 'otros', emoji: '📦' }
    if (!porCat[meta.id]) {
      porCat[meta.id] = { id: meta.id, label: catNombre || 'Otros', emoji: meta.emoji, lineas: [] }
    }
    porCat[meta.id].lineas.push({ id: `n${orden}`, label: concepto, valor, orden })
  })
  Object.values(porCat).forEach(cat => cat.lineas.sort((a, b) => (a.orden || 0) - (b.orden || 0)))
  const cats = ORDEN_CAT.filter(id => porCat[id]).map(id => porCat[id])
  Object.keys(porCat).forEach(id => { if (!ORDEN_CAT.includes(id)) cats.push(porCat[id]) })
  return cats
}

// Lee los ingresos de outlets del mes desde Notion (terraza, spa, upselling, otros)
async function getIngresosNotion(mes) {
  const mesNum = parseInt(mes.split('-')[1])
  const col = MESES_COL[mesNum]
  const out = { terraza: 0, spa: 0, upselling: 0, otrosIngresos: 0 }
  const filas = await notionQueryAll(VENTAS_DB_ID, VENTAS_DS_ID)
  filas.forEach(f => {
    const props = f.properties
    const outlet = (titleProp(props, 'Outlet') || '').toLowerCase()
    const valor = numProp(props, col)
    if (outlet.includes('terrace') || outlet.includes('terraza')) out.terraza = valor
    else if (outlet.includes('aken') || outlet.includes('spa')) out.spa = valor
    else if (outlet.includes('upsell')) out.upselling = valor
    else if (outlet.includes('otro')) out.otrosIngresos = valor
  })
  return out
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

    // Los gastos y los ingresos de A&B/Spa ahora se gestionan en Notion.
    // Estos endpoints se conservan para no romper el front; no afectan la lectura.
    if (req.method === 'POST' && body.action === 'guardar_gastos') {
      return res.status(200).json({ ok: true, info: 'Los gastos se gestionan en Notion (base 💸 Gastos WELLcomm 2026).' })
    }
    if (req.method === 'POST' && body.action === 'reset_gastos') {
      return res.status(200).json({ ok: true, info: 'Los gastos se gestionan en Notion.' })
    }

    if (req.method === 'GET') {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7)

      const [cloudbeds, recibos, categoriasNotion, ingresosNotion] = await Promise.all([
        getCloudbedsData(mes),
        kvGet(`recibos_${mes}`),
        getGastosNotion(mes),
        getIngresosNotion(mes)
      ])

      const gastos = {
        ingresos: {
          habitaciones: cloudbeds.ingresosMes,
          terraza: ingresosNotion.terraza,
          spa: ingresosNotion.spa,
          upselling: ingresosNotion.upselling,
          otrosIngresos: ingresosNotion.otrosIngresos
        },
        categorias: categoriasNotion
      }

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
      const feeSolaraVariable = Math.max(0, Math.round(GOP * 0.05))
      const feeSolaraTotal = feeSolaraVariable
      const utilidadNeta = GOP - feeSolaraTotal

      return res.status(200).json({
        mes, cloudbeds, gastos,
        recibos: recibosLista, gastosPorCategoria, totalRecibos, categorias: CATEGORIAS,
        categoriasResumen,
        resumen: {
          totalIngresos, totalCategorias, totalRecibos, totalGastos,
          GOP, feeSolaraVariable, feeSolaraTotal, utilidadNeta,
          ocupacion: cloudbeds.ocupacion, adr: cloudbeds.adr, revpar: cloudbeds.revpar,
          noches: cloudbeds.noches, totalReservas: cloudbeds.totalReservas, canales: cloudbeds.canales,
        }
      })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
