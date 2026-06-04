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

function calcNights(startDate, endDate) {
  const ms = new Date(endDate) - new Date(startDate)
  return Math.max(1, Math.round(ms / 86400000))
}

async function getDetalleReserva(reservationID, headers) {
  try {
    const res = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${reservationID}`,
      { headers }
    )
    const json = await res.json()
    return json?.data || null
  } catch (e) { return null }
}

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = await getFreshToken()
    const today = new Date().toISOString().split('T')[0]
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // ── 3 llamadas en paralelo ──────────────────────────────────────
    const [enCasaRes, llegadasRes, salidasRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
      // ✅ FIX: status=confirmed para llegadas de hoy
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&checkInFrom=${today}&checkInTo=${today}&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOutFrom=${today}&checkOutTo=${today}&pageSize=25`, { headers }),
    ])

    const enCasaLista  = normalizar(await enCasaRes.json())
    const llegadasLista = normalizar(await llegadasRes.json())
    const salidasLista  = normalizar(await salidasRes.json())

    const enCasaCount   = enCasaLista.length
    const totalHabitaciones = 25
    const ocupacion     = Math.round((enCasaCount / totalHabitaciones) * 100)

    // ── Revenue real por reserva individual ────────────────────────
    const detalles = await Promise.all(
      enCasaLista.map(r => getDetalleReserva(r.reservationID, headers))
    )

    let totalRevenue = 0
    let totalNoches  = 0
    detalles.forEach(d => {
      if (!d) return
      const revenue = parseFloat(d.total || 0)
      const nights  = calcNights(d.startDate, d.endDate)
      if (revenue > 0) { totalRevenue += revenue; totalNoches += nights }
    })

    const adr    = totalNoches > 0 ? Math.round(totalRevenue / totalNoches) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa: enCasaCount,
      llegadas: llegadasLista.length,
      salidas: salidasLista.length,
      totalHabitaciones,
      adr,
      revpar,

      enCasaDetalle: detalles.slice(0, 10).map(d => {
        if (!d) return { nombre: 'Huésped', habitacion: '—', salida: '—', canal: '—', noches: 1, adrNoche: 0 }
        const revenue    = parseFloat(d.total || 0)
        const nights     = calcNights(d.startDate, d.endDate)
        // ✅ FIX: número de cuarto en assigned[0].roomName
        const habitacion = d.assigned?.[0]?.roomName || d.roomName || '—'
        return {
          nombre:    d.guestName || 'Huésped',
          habitacion,
          salida:    d.endDate || '—',
          canal:     d.source || d.sourceName || '—',
          noches:    nights,
          adrNoche:  nights > 0 ? Math.round(revenue / nights) : 0
        }
      }),

      llegadasDetalle: llegadasLista.slice(0, 8).map(r => ({
        nombre:     r.guestName || 'Huésped',
        habitacion: r.roomName  || r.assigned?.[0]?.roomName || '—',
        noches:     r.nights    || '—',
        pais:       r.guestCountry || '—',
        canal:      r.sourceName   || r.source || '—',
        total:      parseFloat(r.grandTotal || r.total || 0)
      })),

      salidasDetalle: salidasLista.slice(0, 8).map(r => ({
        nombre:     r.guestName || 'Huésped',
        habitacion: r.roomName  || '—',
        canal:      r.sourceName || r.source || '—',
        noches:     r.nights || '—'
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
