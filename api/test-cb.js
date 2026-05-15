export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // Test 1: Ver si el refresh funciona
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.CLOUDBEDS_CLIENT_ID,
    client_secret: process.env.CLOUDBEDS_CLIENT_SECRET,
    refresh_token: process.env.CLOUDBEDS_REFRESH_TOKEN
  })

  const refreshRes = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })
  const refreshData = await refreshRes.json()

  // Test 2: Usar el token que devuelve para llamar a Cloudbeds
  let reservasData = null
  if (refreshData.access_token) {
    const cbRes = await fetch(
      'https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=3',
      { headers: { 'Authorization': `Bearer ${refreshData.access_token}`, 'Accept': 'application/json' } }
    )
    reservasData = await cbRes.json()
  }

  return res.status(200).json({
    refresh_ok: !!refreshData.access_token,
    refresh_error: refreshData.error || null,
    token_preview: refreshData.access_token?.slice(0, 20) + '...' || null,
    reservas_count: reservasData?.data?.length || 0,
    reservas_error: reservasData?.error || null,
    env_refresh_token_preview: process.env.CLOUDBEDS_REFRESH_TOKEN?.slice(0, 20) + '...' || 'NO EXISTE'
  })
}
