export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()

    const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Fetch reservas de hoy
    const [reservasRes, ocupacionRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&dateFrom=${today}&dateTo=${today}`, {
        headers: {
          'Authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getPropertyInfo`, {
        headers: {
          'Authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ])

    const reservasData = await reservasRes.json()
    const propData = await ocupacionRes.json()

    // Llegadas de hoy
    const llegadasRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&dateFrom=${today}&dateTo=${today}`, {
      headers: {
        'Authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    const llegadasData = await llegadasRes.json()

    // Salidas de hoy
    const salidasRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&dateFrom=${today}&dateTo=${today}&checkOut=${today}`, {
      headers: {
        'Authorization': `Bearer ${CLOUDBEDS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    const salidasData = await salidasRes.json()

    const enCasa = reservasData?.data?.length || 0
    const llegadas = llegadasData?.data?.length || 0
    const salidas = salidasData?.data?.length || 0
    const totalHabitaciones = 25

    const ocupacion = Math.round((enCasa / totalHabitaciones) * 100)

    // Calcular ADR
    let totalRevenue = 0
    if (reservasData?.data?.length > 0) {
      reservasData.data.forEach(r => {
        totalRevenue += parseFloat(r.totalPrice || 0)
      })
    }
    const adr = enCasa > 0 ? Math.round(totalRevenue / enCasa) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa,
      llegadas,
      salidas,
      totalHabitaciones,
      adr,
      revpar,
      reservasDetalle: reservasData?.data?.slice(0, 10) || [],
      llegadasDetalle: llegadasData?.data?.slice(0, 10) || [],
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
