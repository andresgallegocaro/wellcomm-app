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

// ── FIX: busca el roomTotal en la reserva individual ──────────────
async function getReservacionDetalle(reservationID, headers) {
  try {
    const res = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${reservationID}`,
      { headers }
    )
    const data = await res.json()
    return data?.data || null
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = await getFreshToken()
    const today = new Date().toISOString().split('T')[0]
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Huéspedes en casa
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

    // ── FIX ADR ────────────────────────────────────────────────────
    // Antes: leía roomTotal de la lista general → siempre 0
    // Ahora: pide el detalle de cada reserva individualmente
    const detalles = await Promise.all(
      enCasa.map(r => getReservacionDetalle(r.reservationID, headers))
    )

    let totalRevenue = 0
    let totalNoches = 0

    detalles.forEach(d => {
      if (!d) return
      const roomTotal = parseFloat(d.roomTotal || 0)
      const nights = Math.max(1, parseInt(d.nights || 1))
      if (roomTotal > 0) {
        totalRevenue += roomTotal
        totalNoches += nights
      }
    })

    const adr = totalNoches > 0 ? Math.round(totalRevenue / totalNoches) : 0
    const revpar = Math.round((ocupacion / 100) * adr)
    // ── FIN FIX ────────────────────────────────────────────────────

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa: enCasaCount,
      llegadas: llegadas.length,
      salidas: 0,
      totalHabitaciones,
      adr,
      revpar,
      enCasaDetalle: detalles.slice(0, 8).map(d => ({
        nombre: d?.guestName || 'Huésped',
        habitacion: d?.roomNumber || '—',
        salida: d?.checkOut || d?.endDate || '—',
        canal: d?.sourceName || '—',
        noches: Math.max(1, parseInt(d?.nights || 1)),
        adrNoche: d?.roomTotal && d?.nights
          ? Math.round(parseFloat(d.roomTotal) / Math.max(1, parseInt(d.nights)))
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
