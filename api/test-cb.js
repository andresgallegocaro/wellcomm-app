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
  const today = new Date().toISOString().split('T')[0]
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

  // Probar múltiples endpoints de revenue
  const tests = await Promise.all([
    fetch(`https://api.cloudbeds.com/api/v1.1/getHouseCount?startDate=${today}&endDate=${today}`, { headers }).then(r => r.text()).then(t => ({ endpoint: 'getHouseCount', response: t.slice(0, 200) })),
    fetch(`https://api.cloudbeds.com/api/v1.1/getDailyReports?startDate=${today}&endDate=${today}`, { headers }).then(r => r.text()).then(t => ({ endpoint: 'getDailyReports', response: t.slice(0, 200) })),
    fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_out&checkOut=${today}&pageSize=3`, { headers }).then(r => r.json()).then(d => ({ endpoint: 'checked_out_today', count: d?.data?.length, sample: d?.data?.[0] })),
  ])

  return res.status(200).json(tests)
}
