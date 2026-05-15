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
  return data.access_token
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = await getFreshToken()
    const today = new Date().toISOString().split('T')[0]
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Solo checked_in — el endpoint más confiable
    const enCasaRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`,
      { headers }
    )
    const enCasaData = await enCasaRes.json()
    const enCasa = enCasaData?.data || []

    // Llegadas hoy
    const llegadasRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkIn=${today}&pageSize=25`,
      { headers }
    )
    const llegadasText = await llegadasRes.text()
    const llegadasData = llegadasText.startsWith('<') ? { data: [] } : JSON.parse(llegadasText)
    const llegadas = llegadasData?.data || []

    const enCasaCount = enCasa.length
    const totalHabitaciones = 25
    const ocupacion = Math.round((enCasaCount / totalHabitaciones) * 100)

    // ADR desde roomTotal/nights
    let totalRevenue = 0
    let totalNoches = 0
    enCasa.forEach(r => {
      const roomTotal = parseFloat(r.roomTotal || r.total || r.grandTotal || 0)
      const nights = parseInt(r.nights || 1)
      if (roomTotal > 0) {
        totalRevenue += roomTotal / nights
        totalNoches++
      }
    })

    const adr = totalNoches > 0 ? Math.round(totalRevenue / totalNoches) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa: enCasaCount,
      llegadas: llegadas.length,
      salidas: 0,
      totalHabitaciones,
      adr,
      revpar,
      enCasaDetalle: enCasa.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        salida: r.endDate || '—',
        canal: r.sourceName || '—',
        noches: parseInt(r.nights || 1),
        adrNoche: r.roomTotal && r.nights
          ? Math.round(parseFloat(r.roomTotal) / parseInt(r.nights))
          : 0
      })),
      llegadasDetalle: llegadas.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        noches: r.nights || '—',
        pais: r.guestCountry || '—',
        canal: r.sourceName || '—',
        total: parseFloat(r.grandTotal || r.total || 0)
      })),
      salidasDetalle: []
    })

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
