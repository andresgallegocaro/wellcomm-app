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

// Estrategia tarifaria WELLcomm
const HABITACIONES = {
  estandar: {
    nombre: 'Estándar', cantidad: 11, m2: 20,
    bar: 480000, minimo: 420000, maximo: 580000,
    descripcion: 'Tarifa de entrada · Queen 20m² · todas las amenidades'
  },
  superior: {
    nombre: 'Superior', cantidad: 4, m2: 22,
    bar: 530000, minimo: 460000, maximo: 640000,
    descripcion: 'Tonos neutros · madera natural · Rain Shower · 22m²'
  },
  ejecutiva: {
    nombre: 'Suite Ejecutiva', cantidad: 8, m2: 28,
    bar: 580000, minimo: 510000, maximo: 700000,
    descripcion: 'Cama King · 28m² · la más vendida del hotel'
  },
  presidencial: {
    nombre: 'Suite Presidencial', cantidad: 2, m2: 45,
    bar: 650000, minimo: 580000, maximo: 780000,
    descripcion: 'Espejo de agua · sala · 45m² · masaje 20min en Genius/VIP/Directo'
  }
}

const TOTAL_HAB = 25

const CANALES = {
  ota_rack: { label: 'OTA Rack', descuento: 0, beneficios: ['Add-on $30 USD'] },
  genius_vip: { label: 'Genius / VIP', descuento: 0, beneficios: ['Termal ✓', 'F&B 15% dto ✓'] },
  directo: { label: 'Directo', descuento: 0, beneficios: ['Termal ✓', 'F&B 15% dto ✓', 'Late CO gratis ✓'] },
  no_reembolsable: { label: 'No Reembolsable', descuento: -0.15, beneficios: ['Sin spa', 'Pago al reservar'] },
  corporate: { label: 'Corporate + Grupos', descuento: -0.15, beneficios: ['Desayuno incl.', 'Sin spa', 'Mín 5 hab', 'Depósito 30%'] },
  agencia: { label: 'Agencia / B2B (TAAP)', descuento: -0.12, beneficios: ['Comisión neta', 'Mín 2 noches'] },
  last_minute: { label: 'Last Minute (D-3)', descuento: -0.10, beneficios: ['Solo si occ. <55%'], condicional: true }
}

// Competencia con precios base estimados
const COMPETENCIA = {
  'Botánica Casa Hotel Manila': { bar_base: 380000, factor: 0.95 },
  'Celestino Boutique Hotel & Spa': { bar_base: 450000, factor: 1.05 },
  'Golden Valley Hotel': { bar_base: 280000, factor: 0.85 },
  'Landmark Hotel': { bar_base: 250000, factor: 0.80 },
  'Moabi Hotel': { bar_base: 340000, factor: 0.92 },
  'Nomada Hotel Origen': { bar_base: 390000, factor: 0.97 },
  'Sloh Hotel & Bar Manila': { bar_base: 420000, factor: 1.00 },
  'The Host Medellin Adults Only': { bar_base: 370000, factor: 0.94 },
  'The Somos Bold': { bar_base: 440000, factor: 1.02 },
}

// Eventos Medellín 2026
const EVENTOS_MEDELLIN = [
  { nombre: 'Feria de las Flores', inicio: '2026-08-01', fin: '2026-08-10', factor: 1.35, tipo: 'mega' },
  { nombre: 'Festival Internacional de Jazz', inicio: '2026-09-25', fin: '2026-09-30', factor: 1.20, tipo: 'alto' },
  { nombre: 'Colombiamoda', inicio: '2026-07-22', fin: '2026-07-24', factor: 1.25, tipo: 'alto' },
  { nombre: 'Semana Santa', inicio: '2026-03-29', fin: '2026-04-05', factor: 1.30, tipo: 'alto' },
  { nombre: 'Día de la Madre', inicio: '2026-05-10', fin: '2026-05-11', factor: 1.20, tipo: 'medio' },
  { nombre: 'Festival Tango', inicio: '2026-06-05', fin: '2026-06-15', factor: 1.15, tipo: 'medio' },
  { nombre: 'Navidad Medellín', inicio: '2026-12-01', fin: '2026-12-31', factor: 1.40, tipo: 'mega' },
  { nombre: 'Año Nuevo', inicio: '2026-12-30', fin: '2027-01-02', factor: 1.50, tipo: 'mega' },
]

function getEventosFecha(fecha) {
  return EVENTOS_MEDELLIN.filter(e => fecha >= e.inicio && fecha <= e.fin)
}

function calcularBARRecomendado(tipoHab, ocupacionActual, fecha, preciosCompetencia) {
  const hab = HABITACIONES[tipoHab]
  if (!hab) return null

  const d = new Date(fecha + 'T12:00:00')
  const diaSemana = d.getDay()
  const esFinDeSemana = diaSemana === 5 || diaSemana === 6

  // 1. Factor ocupación
  let factorOcupacion = 1.0
  if (ocupacionActual >= 85) factorOcupacion = 1.20
  else if (ocupacionActual >= 75) factorOcupacion = 1.15
  else if (ocupacionActual >= 65) factorOcupacion = 1.08
  else if (ocupacionActual >= 55) factorOcupacion = 1.03
  else if (ocupacionActual <= 30) factorOcupacion = 0.92
  else if (ocupacionActual <= 40) factorOcupacion = 0.96

  // 2. Factor fin de semana
  const factorFDS = esFinDeSemana ? 1.12 : 1.0

  // 3. Factor eventos
  const eventos = getEventosFecha(fecha)
  const factorEvento = eventos.length > 0
    ? Math.max(...eventos.map(e => e.factor))
    : 1.0

  // 4. Factor competencia
  let factorComp = 1.0
  if (preciosCompetencia && preciosCompetencia.length > 0) {
    const mediaComp = preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length
    const ratio = hab.bar / mediaComp
    if (ratio < 0.85) factorComp = 1.05 // Estamos muy baratos, subir
    else if (ratio > 1.20) factorComp = 0.97 // Estamos muy caros, bajar
  }

  // 5. Calcular BAR recomendado
  let barRecomendado = hab.bar * factorOcupacion * factorFDS * factorEvento * factorComp

  // 6. Aplicar límites
  barRecomendado = Math.max(hab.minimo, Math.min(hab.maximo, barRecomendado))

  // 7. Redondear a miles
  barRecomendado = Math.round(barRecomendado / 1000) * 1000

  // 8. Calcular tarifas por canal
  const tarifasCanal = {}
  Object.entries(CANALES).forEach(([key, canal]) => {
    let precio = barRecomendado * (1 + canal.descuento)
    precio = Math.round(precio / 1000) * 1000
    tarifasCanal[key] = { precio, label: canal.label, beneficios: canal.beneficios }
  })

  // 9. Determinar acción recomendada
  const diff = ((barRecomendado - hab.bar) / hab.bar) * 100
  let accion = 'mantener'
  let accionLabel = '✅ Mantener tarifa'
  let accionColor = '#7EC8A0'
  if (diff > 5) { accion = 'subir'; accionLabel = `⬆️ Subir a $${(barRecomendado/1000).toFixed(0)}K`; accionColor = '#27ae60' }
  else if (diff < -5) { accion = 'bajar'; accionLabel = `⬇️ Bajar a $${(barRecomendado/1000).toFixed(0)}K`; accionColor = '#e74c3c' }

  return {
    tipo: tipoHab,
    nombre: hab.nombre,
    barActual: hab.bar,
    barRecomendado,
    diferencia: Math.round(diff),
    accion,
    accionLabel,
    accionColor,
    tarifasCanal,
    factores: {
      ocupacion: Math.round((factorOcupacion - 1) * 100),
      finDeSemana: esFinDeSemana ? Math.round((factorFDS - 1) * 100) : 0,
      eventos: eventos.map(e => e.nombre),
      factorEvento: Math.round((factorEvento - 1) * 100),
      competencia: Math.round((factorComp - 1) * 100)
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

    const body = req.method === 'POST'
      ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
      : {}

    // Obtener datos reales de Cloudbeds
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    const today = new Date().toISOString().split('T')[0]

    let ocupacionActual = 50
    let enCasa = 0
    let reservasFuturas = []

    try {
      const [enCasaRes, futuraRes] = await Promise.all([
        fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
        fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&pageSize=50`, { headers }),
      ])
      const enCasaData = await enCasaRes.json()
      const futuraData = await futuraRes.json()
      enCasa = enCasaData?.data?.length || 0
      ocupacionActual = Math.round((enCasa / TOTAL_HAB) * 100)
      reservasFuturas = futuraData?.data || []
    } catch (e) {}

    // GET — análisis completo
    if (req.method === 'GET') {
      const accion = req.query.accion || 'dashboard'

      // Precios competencia guardados
      const preciosComp = await kvGet('competencia_precios') || {}
      const preciosCompArray = Object.values(preciosComp).map(h => h.precio).filter(Boolean)

      if (accion === 'dashboard') {
        // Calcular recomendaciones para hoy y próximos 7 días
        const fechas = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() + i)
          return d.toISOString().split('T')[0]
        })

        const recomendaciones = {}
        Object.keys(HABITACIONES).forEach(tipo => {
          recomendaciones[tipo] = fechas.map(fecha => ({
            fecha,
            ...calcularBARRecomendado(tipo, ocupacionActual, fecha, preciosCompArray)
          }))
        })

        // Alertas
        const alertas = []
        Object.keys(HABITACIONES).forEach(tipo => {
          const hoy = recomendaciones[tipo][0]
          if (hoy.diferencia > 10) alertas.push({ tipo: 'subir', hab: hoy.nombre, mensaje: `Sube ${hoy.nombre} a ${(hoy.barRecomendado/1000).toFixed(0)}K (+${hoy.diferencia}%)`, color: '#27ae60' })
          if (hoy.diferencia < -10) alertas.push({ tipo: 'bajar', hab: hoy.nombre, mensaje: `Baja ${hoy.nombre} a ${(hoy.barRecomendado/1000).toFixed(0)}K (${hoy.diferencia}%)`, color: '#e74c3c' })
        })

        // Eventos próximos 30 días
        const eventosProximos = []
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(d.getDate() + i)
          const fecha = d.toISOString().split('T')[0]
          const eventos = getEventosFecha(fecha)
          eventos.forEach(e => {
            if (!eventosProximos.find(ev => ev.nombre === e.nombre)) {
              eventosProximos.push({ ...e, diasParaEvento: i })
            }
          })
        }

        return res.status(200).json({
          ocupacionActual,
          enCasa,
          reservasFuturas: reservasFuturas.length,
          habitaciones: HABITACIONES,
          recomendaciones,
          alertas,
          eventosProximos,
          competencia: preciosComp,
          totalHab: TOTAL_HAB,
          fecha: today
        })
      }

      if (accion === 'competencia') {
        return res.status(200).json({
          competencia: COMPETENCIA,
          preciosGuardados: preciosComp,
          ultimaActualizacion: await kvGet('competencia_ultima_actualizacion')
        })
      }
    }

    // POST — guardar precios competencia / consulta IA
    if (req.method === 'POST') {

      // Guardar precios competencia
      if (body.accion === 'actualizar_competencia') {
        const { precios } = body
        await kvSet('competencia_precios', precios)
        await kvSet('competencia_ultima_actualizacion', new Date().toISOString())
        return res.status(200).json({ ok: true })
      }

      // Revenue Copilot IA
      if (body.accion === 'copilot') {
        const { pregunta } = body

        const preciosComp = await kvGet('competencia_precios') || {}
        const eventosHoy = getEventosFecha(today)

        const recsHoy = {}
        Object.keys(HABITACIONES).forEach(tipo => {
          const preciosCompArray = Object.values(preciosComp).map(h => h.precio).filter(Boolean)
          recsHoy[tipo] = calcularBARRecomendado(tipo, ocupacionActual, today, preciosCompArray)
        })

        const contexto = `Eres el Revenue Manager senior de WELLcomm Spa & Hotel, un boutique wellness de 25 habitaciones en Manila, Medellín, Colombia. Gestionado por SOLARA Homes.

DATOS EN TIEMPO REAL HOY (${today}):
- Ocupación actual: ${ocupacionActual}% (${enCasa} de 25 habitaciones)
- Reservas futuras confirmadas: ${reservasFuturas.length}
- Eventos activos hoy: ${eventosHoy.map(e => e.nombre).join(', ') || 'Ninguno'}

ESTRUCTURA TARIFARIA WELLCOMM:
- Estándar (11 hab, 20m²): BAR $480K | Mín $420K | Máx $580K
- Superior (4 hab, 22m²): BAR $530K | Mín $460K | Máx $640K  
- Suite Ejecutiva (8 hab, 28m²): BAR $580K | Mín $510K | Máx $700K
- Suite Presidencial (2 hab, 45m²): BAR $650K | Mín $580K | Máx $780K

REGLAS DE PRICING:
- Paridad de precio en todos los canales (mismo precio, más valor según canal)
- OTA Rack: BAR + Add-on $30 USD
- Genius/VIP + Directo: BAR + Termal + F&B 15% dto
- Directo además: Late CO gratis
- No Reembolsable: BAR -15% sin spa
- Corporate/Grupos: BAR -15% con desayuno, mín 5 hab, depósito 30%
- Agencia/B2B (TAAP): BAR -12%, mín 2 noches
- Last Minute D-3: mín -10%, solo si occ <55%
- Escalonado: Estándar→Superior +$50K | Superior→Ejecutiva +$50K | Ejecutiva→Presidencial +$120K
- BAR máximo activa cuando occ proyectada >80%

RECOMENDACIONES IA PARA HOY:
${Object.values(recsHoy).map(r => `- ${r.nombre}: BAR recomendado $${(r.barRecomendado/1000).toFixed(0)}K (${r.accionLabel})`).join('\n')}

COMPETENCIA (últimos precios registrados):
${Object.entries(preciosComp).map(([hotel, data]) => `- ${hotel}: $${(data.precio/1000).toFixed(0)}K`).join('\n') || 'Sin datos de competencia aún'}

Razona como el mejor revenue manager del mundo. Usa datos concretos. Da recomendaciones accionables con números exactos. Explica el razonamiento detrás de cada decisión. Responde en español.`

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: contexto,
            messages: [{ role: 'user', content: pregunta }]
          })
        })

        const claudeData = await claudeRes.json()
        const respuesta = claudeData.content?.[0]?.text || 'Error al consultar el Revenue Copilot.'

        return res.status(200).json({ respuesta })
      }
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
