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
  return (await res.json()).access_token
}

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Probamos getRoomsFree (disponibilidad) que sí suele estar disponible
    const hoy = new Date().toISOString().slice(0, 10)
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const r1 = await fetch(`https://api.cloudbeds.com/api/v1.1/getAvailableRoomTypes?startDate=${hoy}&endDate=${manana}`, { headers })
    const disponibles = await r1.json()

    // Y sacamos los nombres de habitación reales de las reservas activas
    const r2 = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=30`, { headers })
    const reservasLista = normalizar(await r2.json())

    const nombresHabitaciones = new Set()
    for (const rsv of reservasLista.slice(0, 30)) {
      try {
        const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${rsv.reservationID}`, { headers })
        const d = (await dr.json())?.data
        ;(d?.assigned || []).forEach(a => {
          if (a.roomName) nombresHabitaciones.add(a.roomName)
        })
      } catch {}
    }

    return res.status(200).json({
      disponibilidad: disponibles?.data || disponibles,
      habitacionesOcupadasAhora: Array.from(nombresHabitaciones).sort()
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
