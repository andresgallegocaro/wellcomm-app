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
  res.setHeader('Cache-Control', 'no-store')
  const token = await getFreshToken()
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  // Ver todos los campos de una reserva checked_in
  const r1 = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=9250853682215`, { headers })
  const d1 = await r1.json()

  return res.status(200).json(d1)
}
