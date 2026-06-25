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

async function kvDel(key) {
  await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
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
// SEMILLAS DE GASTOS POR MES — valores reales del balance Siigo
// valores = [ENERO, FEBRERO, MARZO, ABRIL, MAYO] en COP (positivos = gasto)
// Cada concepto suma sus cuentas Siigo (operativa 51 + admin 52 + costo 72).
// Validado: la suma de MAYO reproduce exactamente el cierre (229.626.216).
// Ene–May: se arma desde aquí. Jun+: arrastre del mes anterior.
// ============================================================
const MESES_SEMILLA = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']

const GASTOS_BASE = [
  {
    id: 'nomina', label: 'Nómina y personal', emoji: '👥',
    lineas: [
      { id: 'nom1', label: 'Sueldos', valores: [78393687, 72785703, 84402533, 72691441, 52496268] },
      { id: 'nom2', label: 'Horas extras y recargos', valores: [9169666, 6775121, 6907119, 9352489, 7705515] },
      { id: 'nom3', label: 'Auxilio de transporte', valores: [5928461, 5729185, 6202466, 5779004, 5239298] },
      { id: 'nom4', label: 'Incapacidades', valores: [133333, 822434, 561580, 231427, 509100] },
      { id: 'nom5', label: 'Cesantías', valores: [7976075, 7198794, 7856753, 9895758, 5844753] },
      { id: 'nom6', label: 'Intereses sobre cesantías', valores: [5965604, 863855, 942810, 982695, 701371] },
      { id: 'nom7', label: 'Prima de servicios', valores: [7976075, 7198794, 7856753, 9895758, 5844753] },
      { id: 'nom8', label: 'Vacaciones', valores: [6537975, 7239440, 3999174, 7036683, 6532238] },
      { id: 'nom9', label: 'Bonificaciones', valores: [100000, 1851800, 3067050, 10579892, 300000] },
      { id: 'nom10', label: 'Dotación y suministro', valores: [1447000, 234160, 108000, 793000, 0] },
      { id: 'nom11', label: 'Aportes ARL', valores: [1113289, 982022, 1001248, 874179, 694906] },
      { id: 'nom12', label: 'Aportes EPS', valores: [17509, 60095, 40568, 7278, 2335] },
      { id: 'nom13', label: 'Aportes pensión', valores: [10748444, 10232159, 11044136, 10189755, 7192362] },
      { id: 'nom14', label: 'Aportes caja de compensación', valores: [3578941, 3419956, 3666577, 3522958, 2613159] },
      { id: 'nom15', label: 'Gastos médicos y drogas', valores: [645700, 807702, 893700, 814300, 641300] },
      { id: 'nom16', label: 'Bienestar y atención a empleados', valores: [840000, 10487, 1253672, 357200, 234800] },
      { id: 'nom17', label: 'Indemnizaciones laborales', valores: [0, 3677778, 2560093, 2054815, 0] },
    ]
  },
  {
    id: 'honorarios', label: 'Honorarios y asesorías', emoji: '📐',
    lineas: [
      { id: 'hon1', label: 'Asesoría jurídica', valores: [7420905, 3670000, 3670000, 8922715, 1750905] },
      { id: 'hon2', label: 'Asesoría comercial (RevenueClick)', valores: [0, 0, 1375000, 0, 3208333] },
      { id: 'hon3', label: 'Asesoría SST y RRHH', valores: [2600000, 2600000, 2600000, 2600000, 2860000] },
      { id: 'hon4', label: 'Asesoría Spa', valores: [3905796, 5137564, 3679712, 4404740, 3040440] },
    ]
  },
  {
    id: 'impuestos', label: 'Impuestos', emoji: '🏛️',
    lineas: [
      { id: 'imp1', label: 'Industria y comercio (ICA)', valores: [2617245, 2438184, 2265016, 1626165, 1386452] },
      { id: 'imp2', label: 'Impuesto predial', valores: [0, 0, 1478703, 1478703, 1478703] },
      { id: 'imp3', label: 'Impuesto al consumo', valores: [0, 11704, 0, 0, 0] },
      { id: 'imp4', label: 'AIU', valores: [43715, 0, 0, 320674, 192404] },
      { id: 'imp5', label: 'Otros impuestos asumidos', valores: [0, 0, 660000, 18625, 120000] },
      { id: 'imp6', label: 'Multas, sanciones y litigios', valores: [0, 1048000, 524000, 0, 0] },
      { id: 'imp7', label: 'Gastos no deducibles', valores: [0, 0, 4008586, 0, 0] },
    ]
  },
  {
    id: 'contrib_seguros', label: 'Contribuciones y seguros', emoji: '🛡️',
    lineas: [
      { id: 'cs1', label: 'Contribuciones (Barrio Manila, Fontur)', valores: [1063731, 999780, 937935, 838773, 624161] },
      { id: 'cs2', label: 'Afiliaciones y sostenimiento', valores: [0, 0, 0, 6360600, 0] },
      { id: 'cs3', label: 'Seguro todo riesgo', valores: [0, 3526258, 3526258, 3526258, 3526258] },
    ]
  },
  {
    id: 'servicios_publicos', label: 'Servicios públicos', emoji: '⚡',
    lineas: [
      { id: 'sp1', label: 'Energía eléctrica', valores: [20463590, 19407938, 18368701, 16403534, 14696499] },
      { id: 'sp2', label: 'Acueducto', valores: [4372889, 3797540, 3991379, 3941553, 3536146] },
      { id: 'sp3', label: 'Gas', valores: [4473474, 3827011, 4838885, 4463630, 3830737] },
      { id: 'sp4', label: 'Alumbrado público', valores: [603715, 604769, 635127, 635380, 637931] },
      { id: 'sp5', label: 'Tasa de aseo', valores: [163783, 164412, 179897, 182219, 183867] },
      { id: 'sp6', label: 'Internet', valores: [1270865, 1269102, 1270674, 2871617, 2921464] },
    ]
  },
  {
    id: 'servicios_operativos', label: 'Servicios operativos', emoji: '🧰',
    lineas: [
      { id: 'so1', label: 'Aseo y vigilancia', valores: [471116, 506038, 181700, 211700, 181700] },
      { id: 'so2', label: 'Fumigación', valores: [579100, 665965, 665965, 0, 0] },
      { id: 'so3', label: 'Temporales', valores: [967150, 380000, 300000, 3206737, 2154042] },
      { id: 'so4', label: 'Procesamiento de datos (software)', valores: [4439315, 6223382, 5107671, 4626783, 8008562] },
      { id: 'so5', label: 'Licencia programa contable', valores: [0, 0, 1869900, 0, 0] },
      { id: 'so6', label: 'Transporte, fletes y acarreos', valores: [25000, 44000, 263708, 24000, 14000] },
    ]
  },
  {
    id: 'mantenimiento', label: 'Mantenimiento y reparaciones', emoji: '🔧',
    lineas: [
      { id: 'mn1', label: 'Mantenimiento piscinas', valores: [6883258, 579723, 1719723, 579723, 579723] },
      { id: 'mn2', label: 'Mantenimiento ascensores', valores: [554484, 554484, 554484, 554484, 554484] },
      { id: 'mn3', label: 'Mantenimiento aire acondicionado', valores: [3787700, 1398000, 305000, 884800, 345700] },
      { id: 'mn4', label: 'Mantenimiento motobombas', valores: [1614910, 514904, 0, 4825000, 2300000] },
      { id: 'mn5', label: 'Cerraduras electrónicas', valores: [500000, 0, 140000, 920800, 0] },
      { id: 'mn6', label: 'Construcciones y edificaciones', valores: [663066, 949622, 0, 579245, 252017] },
      { id: 'mn7', label: 'Equipo de oficina', valores: [184874, 1046966, 378151, 375294, 0] },
      { id: 'mn8', label: 'Equipo de cómputo y comunicación', valores: [160000, 403363, 0, 0, 0] },
      { id: 'mn9', label: 'Gastos de ferretería', valores: [466471, 628992, 379283, 98571, 83431] },
      { id: 'mn10', label: 'Arreglos ornamentales', valores: [2558897, 1675898, 2950001, 0, 240000] },
      { id: 'mn11', label: 'Reparaciones locativas', valores: [0, 21008, 390245, 0, 0] },
      { id: 'mn12', label: 'Mantenimiento y reparaciones (hotel)', valores: [0, 399160, 308540, 0, 0] },
    ]
  },
  {
    id: 'comisiones', label: 'Comisiones y financieros', emoji: '💳',
    lineas: [
      { id: 'cm1', label: 'Comisiones OTAs (Booking, Expedia)', valores: [31903902, 37879145, 32719906, 24407437, 21146561] },
      { id: 'cm2', label: 'Comisiones (Alianza Fiduciaria)', valores: [1750905, 1750905, 1750905, 1750905, 1750905] },
      { id: 'cm3', label: 'Comisiones bancarias', valores: [8291432, 7327178, 8943050, 6352332, 5076246] },
      { id: 'cm4', label: 'Impuesto 4x1.000', valores: [697926, 3557, 767353, 767353, 394954] },
      { id: 'cm5', label: 'Impuesto 4x1.000 no deducible', valores: [692711, 0, 767353, 499353, 394954] },
      { id: 'cm6', label: 'Cuota de manejo bancaria', valores: [115072, 14900, 100343, 89080, 89080] },
      { id: 'cm7', label: 'Intereses corrientes y financieros', valores: [89375, 827768, 714659, 377014, 205442] },
      { id: 'cm8', label: 'Descuentos comerciales condicionados', valores: [6982808, 654622, 1547168, 0, 0] },
    ]
  },
  {
    id: 'marketing', label: 'Marketing', emoji: '📣',
    lineas: [
      { id: 'mk1', label: 'Marketing corporativo', valores: [17031383, 16327008, 17341178, 17251757, 16962484] },
      { id: 'mk2', label: 'Relaciones e influenciadores', valores: [2618000, 400000, 1968000, 834000, 2984000] },
    ]
  },
  {
    id: 'costos_hotel', label: 'Costos operativos del hotel', emoji: '🏨',
    lineas: [
      { id: 'ch1', label: 'Desayuno invitados', valores: [12617636, 10265060, 6043680, 4783494, 7548776] },
      { id: 'ch2', label: 'Lavandería y similares', valores: [9339154, 9320139, 8158500, 3481200, 8713017] },
      { id: 'ch3', label: 'Experiencias hotel', valores: [150442, 108122, 332855, 52874, 0] },
      { id: 'ch4', label: 'PMS (software operativo)', valores: [976718, 713254, 0, 293297, 736428] },
      { id: 'ch5', label: 'Musicalización (Brandtrack)', valores: [309510, 659510, 309510, 309510, 309510] },
      { id: 'ch6', label: 'Fumigación (hotel)', valores: [0, 0, 0, 446408, 446408] },
      { id: 'ch7', label: 'Lavado de alfombras y muebles', valores: [0, 0, 0, 0, 105000] },
    ]
  },
  {
    id: 'insumos', label: 'Insumos y suministros', emoji: '🧴',
    lineas: [
      { id: 'in1', label: 'Elementos de aseo y cafetería', valores: [1692821, 741434, 2480762, 2049717, 2271757] },
      { id: 'in2', label: 'Lencería y decoración', valores: [0, 1479779, 1551094, 1729779, 2584181] },
      { id: 'in3', label: 'Amenities', valores: [1256051, 124448, 6115464, 260756, 29510] },
      { id: 'in4', label: 'Minibar', valores: [0, 3117075, 0, 367152, 0] },
      { id: 'in5', label: 'Vajilla y cristalería', valores: [0, 0, 0, 0, 1957065] },
      { id: 'in6', label: 'Implementos de aseo', valores: [760000, 561740, 58580, 0, 0] },
      { id: 'in7', label: 'Útiles y papelería', valores: [1149304, 1257295, 894649, 628706, 314031] },
      { id: 'in8', label: 'Representación y RRPP', valores: [366450, 570227, 317060, 495670, 236790] },
      { id: 'in9', label: 'Atención al cliente', valores: [604022, 285883, 490150, 129000, 39800] },
      { id: 'in10', label: 'Taxis y buses', valores: [377946, 228554, 84990, 406502, 57100] },
      { id: 'in11', label: 'Gastos de viaje (alojamiento y pasajes)', valores: [0, 2044916, 475200, 0, 0] },
      { id: 'in12', label: 'Alimentación personal', valores: [0, 0, 0, 132000, 0] },
      { id: 'in13', label: 'Muebles y enseres', valores: [0, 0, 0, 251933, 0] },
      { id: 'in14', label: 'Elementos de cafetería', valores: [29159, 6000, 0, 0, 0] },
      { id: 'in15', label: 'Trámites, registro y licencias', valores: [12100, 0, 0, 0, 12100] },
      { id: 'in16', label: 'TV por suscripción', valores: [0, 0, 99800, 0, 0] },
    ]
  },
]

// Construye la estructura de gastos de un mes semilla (ene–may)
function construirSemillaMes(mes) {
  const idx = MESES_SEMILLA.indexOf(mes)
  if (idx === -1) return null
  return GASTOS_BASE.map(cat => ({
    id: cat.id,
    label: cat.label,
    emoji: cat.emoji,
    lineas: cat.lineas.map(l => ({
      id: l.id,
      label: l.label,
      valor: Number(l.valores[idx]) || 0
    }))
  }))
}

// Resuelve las categorías de un mes con prioridad:
// 1) si el mes fue EDITADO manualmente y guardado -> usa lo guardado
// 2) si es mes semilla (ene–may) -> usa la semilla del balance
// 3) si no (jun+) -> arrastra el mes anterior (recursivo)
async function resolverCategorias(mes, visited = 0) {
  if (visited > 14) return []
  const saved = await kvGet(`gastos_${mes}`)
  if (saved && saved.editadoManual && Array.isArray(saved.categorias)) {
    return JSON.parse(JSON.stringify(saved.categorias))
  }
  const semilla = construirSemillaMes(mes)
  if (semilla) return semilla
  let [y, m] = mes.split('-').map(Number)
  m -= 1; if (m === 0) { m = 12; y -= 1 }
  const prev = `${y}-${String(m).padStart(2, '0')}`
  return await resolverCategorias(prev, visited + 1)
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

    // Guardar gastos: marca editadoManual para que prevalezca sobre la semilla
    if (req.method === 'POST' && body.action === 'guardar_gastos') {
      const { mes, gastos } = body
      const g = { ...gastos, editadoManual: true }
      await kvSet(`gastos_${mes}`, g)
      return res.status(200).json({ ok: true })
    }

    // Restablecer un mes: borra lo guardado y vuelve a la semilla / arrastre
    if (req.method === 'POST' && body.action === 'reset_gastos') {
      const { mes } = body
      await kvDel(`gastos_${mes}`)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'GET') {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7)

      const [cloudbeds, gastosGuardados, recibos, categoriasResueltas] = await Promise.all([
        getCloudbedsData(mes),
        kvGet(`gastos_${mes}`),
        kvGet(`recibos_${mes}`),
        resolverCategorias(mes)
      ])

      const ingresosBase = (gastosGuardados && gastosGuardados.ingresos)
        ? gastosGuardados.ingresos
        : { habitaciones: 0, terraza: 0, spa: 0, upselling: 0, otrosIngresos: 0 }
      const gastos = { ingresos: ingresosBase, categorias: categoriasResueltas }
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
