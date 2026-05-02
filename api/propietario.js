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

const PROPIETARIOS = {
  '0001': { nombre: 'Propietario 1', pin: '1111' },
  '0002': { nombre: 'Propietario 2', pin: '2222' },
  '0003': { nombre: 'Propietario 3', pin: '3333' },
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

    // Verificar PIN
    if (req.method === 'POST' && body.action === 'login') {
      const { pin } = body
      const prop = Object.entries(PROPIETARIOS).find(([, p]) => p.pin === pin)
      if (!prop) return res.status(401).json({ error: 'PIN incorrecto' })
      return res.status(200).json({ ok: true, id: prop[0], nombre: prop[1].nombre })
    }

    // Obtener datos del mes
    if (req.method === 'GET') {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7)

      // Datos de Cloudbeds
      const token = process.env.CLOUDBEDS_ACCESS_TOKEN
      let cloudbeds = { enCasa: 0, llegadas: 0, ocupacion: 0, adr: 0, revpar: 0, reservas: [] }
      try {
        const cbRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=100`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        })
        const cbData = await cbRes.json()
        const reservas = cbData?.data || []
        const enCasa = reservas.length
        const totalRevenue = reservas.reduce((acc, r) => acc + parseFloat(r.grandTotal || 0), 0)
        const adr = enCasa > 0 ? Math.round(totalRevenue / enCasa) : 0
        cloudbeds = {
          enCasa,
          ocupacion: Math.round((enCasa / 25) * 100),
          adr,
          revpar: Math.round((enCasa / 25) * adr),
          reservas: reservas.slice(0, 10).map(r => ({
            huesped: r.guestName || 'Huésped',
            habitacion: r.roomNumber || '—',
            checkin: r.startDate || '—',
            checkout: r.endDate || '—',
            total: parseFloat(r.grandTotal || 0),
            canal: r.sourceName || 'Directo'
          }))
        }
      } catch (e) {}

      // Gastos guardados
      const gastos = await kvGet(`gastos_${mes}`) || {
        fijos: {
          nomina: 0, arriendo: 0, serviciosPublicos: 0, internet: 0,
          seguros: 0, cloudbeds: 0, pricepoint: 0, siana: 0, poster: 0, otrosFijos: 0
        },
        variables: {
          amenities: 0, lavanderia: 0, desayunos: 0, comisionBooking: 0,
          comisionExpedia: 0, comisionAirbnb: 0, mantenimiento: 0, otrosVariables: 0
        },
        ingresos: {
          habitaciones: 0, terraza: 0, spa: 0, upselling: 0, otrosIngresos: 0
        }
      }

      // Calcular totales
      const totalFijos = Object.values(gastos.fijos).reduce((a, b) => a + (Number(b) || 0), 0)
      const totalVariables = Object.values(gastos.variables).reduce((a, b) => a + (Number(b) || 0), 0)
      const totalGastos = totalFijos + totalVariables

      const totalIngresos = Object.values(gastos.ingresos).reduce((a, b) => a + (Number(b) || 0), 0)
      const GOP = totalIngresos - totalGastos
      const feeSolaraFijo = 8000000
      const feeSolaraVariable = Math.max(0, Math.round(GOP * 0.05))
      const feeSolaraTotal = feeSolaraFijo + feeSolaraVariable
      const utilidadNeta = GOP - feeSolaraTotal

      return res.status(200).json({
        mes,
        cloudbeds,
        gastos,
        resumen: {
          totalIngresos,
          totalFijos,
          totalVariables,
          totalGastos,
          GOP,
          feeSolaraFijo,
          feeSolaraVariable,
          feeSolaraTotal,
          utilidadNeta,
          ocupacion: cloudbeds.ocupacion,
          adr: cloudbeds.adr,
          revpar: cloudbeds.revpar,
        }
      })
    }

    // Guardar gastos
    if (req.method === 'POST' && body.action === 'guardar_gastos') {
      const { mes, gastos } = body
      await kvSet(`gastos_${mes}`, gastos)
      return res.status(200).json({ ok: true })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
