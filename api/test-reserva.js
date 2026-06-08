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

    // Listar TODAS las habitaciones del hotel
    const r = await fetch('https://api.cloudbeds.com/api/v1.1/getRooms', { headers })
    const data = await r.json()
    const habitaciones = normalizar(data).map(h => ({
      roomID: h.roomID,
      roomName: h.roomName,
      roomTypeName: h.roomTypeName,
      roomTypeID: h.roomTypeID
    }))

    return res.status(200).json({ total: habitaciones.length, habitaciones })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
