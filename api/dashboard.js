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

async function safeFetch(url, headers) {
  try {
    const res = await fetch(url, { headers })
    const text = await res.text()
    if (text.startsWith('<')) return null // Cloudbeds devolvió HTML — endpoint no disponible
    return JSON.parse(text)
  } catch (e) {
    return null
  }
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

    // Llamadas seguras — no rompen aunque devuelvan HTML
    const [enCasaData, llegadasData, salidasData] = await Promise.all([
      safeFetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
      safeFetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkIn=${today}&pageSize=25`, { headers }),
      safeFetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOut=${today}&pageSize=25`, { headers }),
    ])

    const enCasa = enCasaData?.data || []
    const llegadas = llegadasData?.data || []
    const salidas = salidasData?.data || []
    const enCasaCount = enCasa.length
    const totalHabitaciones = 25
    const ocupacion = Math.round((enCasaCount / totalHabitaciones) * 100)

    // Calcular ADR real desde roomTotal y nights
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
      salidas: salidas.length,
      totalHabitaciones,
      adr,
      revpar,
      llegadasDetalle: llegadas.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        noches: r.nights || '—',
        pais: r.guestCountry || '—',
        canal: r.sourceName || '—',
        total: parseFloat(r.grandTotal || r.total || 0)
      })),
      salidasDetalle: salidas.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        total: parseFloat(r.grandTotal || r.total || 0)
      })),
      enCasaDetalle: enCasa.slice(0, 8).map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        salida: r.endDate || '—',
        canal: r.sourceName || '—',
        noches: r.nights || '—',
        adrNoche: r.roomTotal && r.nights
          ? Math.round(parseFloat(r.roomTotal) / parseInt(r.nights))
          : 0
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
