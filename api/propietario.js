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

async function getCloudbedsData(mes) {
  const token = process.env.CLOUDBEDS_ACCESS_TOKEN
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  // Calcular rango del mes
  const [year, month] = mes.split('-')
  const fechaInicio = `${mes}-01`
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const fechaFin = `${mes}-${lastDay}`

  try {
    // Reservas del mes (checked_in + checked_out)
    const [checkedInRes, checkedOutRes, enCasaRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=100`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_out&checkOut=${fechaFin}&checkIn=${fechaInicio}&pageSize=100`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
    ])

    const [checkedInData, checkedOutData, enCasaData] = await Promise.all([
      checkedInRes.json(),
      checkedOutRes.json(),
      enCasaRes.json(),
    ])

    // Reservas activas + del mes
    const reservasMes = [
      ...(checkedInData?.data || []),
      ...(checkedOutData?.data || []),
    ]

    // Calcular ingresos del mes
    const ingresosMes = reservasMes.reduce((acc, r) => acc + parseFloat(r.grandTotal || 0), 0)
    const noches = reservasMes.reduce((acc, r) => acc + parseInt(r.nights || 0), 0)
    const adr = noches > 0 ? Math.round(ingresosMes / noches) : 0

    // Ocupación del mes
    const diasMes = lastDay
    const totalNochesDisponibles = 25 * diasMes
    const ocupacion = totalNochesDisponibles > 0 ? Math.round((noches / totalNochesDisponibles) * 100) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    // En casa ahora
    const enCasa = enCasaData?.data?.length || 0

    // Canal de ventas
    const canales = {}
    reservasMes.forEach(r => {
      const canal = r.sourceName || 'Directo'
      canales[canal] = (canales[canal] || 0) + parseFloat(r.grandTotal || 0)
    })

    return {
      ingresosMes: Math.round(ingresosMes),
      noches,
      adr,
      ocupacion,
      revpar,
      enCasa,
      totalReservas: reservasMes.length,
      canales,
      reservasActuales: (enCasaData?.data || []).slice(0, 10).map(r => ({
        huesped: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        checkin: r.startDate || '—',
        checkout: r.endDate || '—',
        total: parseFloat(r.grandTotal || 0),
        canal: r.sourceName || 'Directo',
        noches: r.nights || 1,
      }))
    }
  } catch (e) {
    return {
      ingresosMes: 0, noches: 0, adr: 0, ocupacion: 0,
      revpar: 0, enCasa: 0, totalReservas: 0, canales: {}, reservasActuales: []
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

    // Login
    if (req.method === 'POST' && body.action === 'login') {
      const prop = Object.entries(PROPIETARIOS).find(([, p]) => p.pin === body.pin)
      if (!prop) return res.status(401).json({ error: 'PIN incorrecto' })
      return res.status(200).json({ ok: true, id: prop[0], nombre: prop[1].nombre })
    }

    // Obtener datos del mes
    if (req.method === 'GET') {
      const mes = req.query.mes || new Date().toISOString().slice(0, 7)

      // Datos Cloudbeds en paralelo con gastos guardados
      const [cloudbeds, gastosGuardados] = await Promise.all([
        getCloudbedsData(mes),
        kvGet(`gastos_${mes}`)
      ])

      const gastos = gastosGuardados || {
        fijos: {
          nomina: 0, arriendo: 0, serviciosPublicos: 0, internet: 0,
          seguros: 0, cloudbeds_fee: 0, pricepoint: 0, siana_fee: 0,
          poster_fee: 0, otrosFijos: 0
        },
        variables: {
          amenities: 0, lavanderia: 0, desayunos: 0, comisionBooking: 0,
          comisionExpedia: 0, comisionAirbnb: 0, mantenimiento: 0, otrosVariables: 0
        },
        ingresos: {
          // Habitaciones se toma de Cloudbeds automáticamente
          habitaciones: cloudbeds.ingresosMes,
          terraza: 0,  // Pendiente Poster
          spa: 0,      // Pendiente Siana
          upselling: 0,
          otrosIngresos: 0
        }
      }

      // Siempre actualizar habitaciones con Cloudbeds real
      gastos.ingresos.habitaciones = cloudbeds.ingresosMes

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
          noches: cloudbeds.noches,
          totalReservas: cloudbeds.totalReservas,
          canales: cloudbeds.canales,
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
