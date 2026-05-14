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
  const cbRes = await fetch('https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=3', {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  })
  const cbData = await cbRes.json()
  return res.status(200).json(cbData?.data?.[0] || { error: 'sin datos' })
}
