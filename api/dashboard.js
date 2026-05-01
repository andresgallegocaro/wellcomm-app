async function getValidToken() {
  const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID
  const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET
  const REFRESH_TOKEN = process.env.CLOUDBEDS_REFRESH_TOKEN

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN
  })

  const refreshRes = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  const refreshData = await refreshRes.json()
  return refreshData.access_token || process.env.CLOUDBEDS_ACCESS_TOKEN
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = await getValidToken()
    const today = new Date().toISOString().split('T')[0]

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    const [enCasaRes, llegadas
