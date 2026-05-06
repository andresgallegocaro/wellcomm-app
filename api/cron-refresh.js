export default async function handler(req, res) {
  try {
    const authHeader = req.headers['authorization']
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID
    const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET
    const REFRESH_TOKEN = process.env.CLOUDBEDS_REFRESH_TOKEN
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN
    const PROJECT_ID = 'prj_KipRKiusk0lEGhWSKvHb8UBIxvPE'

    // 1. Renovar token con Cloudbeds
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    })

    const tokenRes = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'No se pudo renovar el token', detail: tokenData })
    }

    const newAccessToken = tokenData.access_token
    const newRefreshToken = tokenData.refresh_token

    // 2. Obtener IDs de las variables existentes en Vercel
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    })
    const listData = await listRes.json()
    const envVars = listData.envs || []

    const accessTokenVar = envVars.find(e => e.key === 'CLOUDBEDS_ACCESS_TOKEN')
    const refreshTokenVar = envVars.find(e => e.key === 'CLOUDBEDS_REFRESH_TOKEN')

    // 3. Actualizar CLOUDBEDS_ACCESS_TOKEN
    if (accessTokenVar) {
      await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${accessTokenVar.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: newAccessToken })
      })
    }

    // 4. Actualizar CLOUDBEDS_REFRESH_TOKEN
    if (newRefreshToken && refreshTokenVar) {
      await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${refreshTokenVar.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: newRefreshToken })
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Token renovado y actualizado en Vercel',
      timestamp: new Date().toISOString(),
      expires_in: tokenData.expires_in,
      access_token_updated: !!accessTokenVar,
      refresh_token_updated: !!(newRefreshToken && refreshTokenVar)
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
