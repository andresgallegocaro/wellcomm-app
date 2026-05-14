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

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = await getFreshToken()
    const today = new Date().toISOString().split('T')[0]
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Llamadas en paralelo
    const [enCasaRes, llegadasRes, salidasRes, houseCountRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkIn=${today}&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOut=${today}&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getHouseCount?startDate=${today}&endDate=${today}`, { headers }),
    ])

    const [enCasaData, llegadasData, salidasData, houseCountData] = await Promise.all([
      enCasaRes.json(),
      llegadasRes.json(),
      salidasRes.json(),
      houseCountRes.json(),
    ])

    const enCasa = enCasaData?.data || []
    const llegadas = llegadasData?.data || []
    const salidas = salidasData?.data || []
    const enCasaCount = enCasa.length
    const totalHabitaciones = 25
    const ocupacion = Math.round((enCasaCount / totalHabitaciones) * 100)

    // ADR real desde getHouseCount
    let adr = 0
    let revpar = 0
    let ingresosHoy = 0

    if (houseCountData?.success && houseCountData?.data) {
      const hc = Array.isArray(houseCountData.data) ? houseCountData.data[0] : houseCountData.data
      const roomRevenue = parseFloat(hc?.roomRevenue || hc?.revenue || hc?.totalRevenue || 0)
      const roomsOccupied = parseInt(hc?.roomsOccupied || hc?.occupied || enCasaCount || 0)
      ingresosHoy = roomRevenue
      adr = roomsOccupied > 0 ? Math.round(roomRevenue / roomsOccupied) : 0
      revpar = Math.round((ocupacion / 100) * adr)
    }

    // Si getHouseCount no devuelve revenue, calcular desde balance de reservas checked_out hoy
    if (adr === 0) {
      const checkedOutHoyRes = await fetch(
        `https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_out&checkOut=${today}&pageSize=25`,
        { headers }
      )
      const checkedOutHoyData = await checkedOutHoyRes.json()
      const checkedOutHoy = checkedOutHoyData?.data || []
      const revenueCheckedOut = checkedOutHoy.reduce((acc, r) => {
        return acc + parseFloat(r.grandTotal || r.balance || r.totalPrice || 0)
      }, 0)
      if (checkedOutHoy.length > 0 && revenueCheckedOut > 0) {
        adr = Math.round(revenueCheckedOut / checkedOutHoy.length)
        revpar = Math.round((ocupacion / 100) * adr)
        ingresosHoy = revenueCheckedOut
      }
    }

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa: enCasaCount,
      llegadas: llegadas.length,
      salidas: salidas.length,
      totalHabitaciones,
      adr,
      revpar,
      ingresosHoy,
      houseCountRaw: houseCountData?.data || null,
      llegadasDetalle: llegadas.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        noches: r.nights || '—',
        pais: r.guestCountry || '—',
        canal: r.sourceName || '—',
        total: parseFloat(r.grandTotal || 0)
      })),
      salidasDetalle: salidas.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        total: parseFloat(r.grandTotal || 0)
      })),
      enCasaDetalle: enCasa.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        salida: r.endDate || '—',
        canal: r.sourceName || '—',
        noches: r.nights || '—',
        balance: parseFloat(r.balance || 0)
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
