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
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Tom Dequesne — estadía que cruza abril/mayo (29 abr → 3 may)
    const lista = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=2026-04-29&checkInTo=2026-04-29&pageSize=20`,
      { headers }
    ).then(r => r.json())

    const arr = Array.isArray(lista?.data) ? lista.data : Object.values(lista?.data || {})
    const tom = arr.find(r => (r.guestName || '').includes('Dequesne')) || arr[0]

    const detalle = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${tom.reservationID}`,
      { headers }
    ).then(r => r.json())

    const d = detalle?.data

    return res.status(200).json({
      huesped: d?.guestName,
      checkin: d?.startDate,
      checkout: d?.endDate,
      total: d?.total,
      estado: d?.status,
      // El dato clave: desglose por día
      dailyRates_directo: d?.dailyRates,
      dailyRates_enAssigned: d?.assigned?.map(a => ({ room: a.roomName, rates: a.dailyRates }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
