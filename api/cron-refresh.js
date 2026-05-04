export default async function handler(req, res) {
  try {
    // Verificar que es una llamada autorizada de Vercel Cron
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

    // 2. Actualizar CLOUDBEDS_ACCESS_TOKEN en Vercel
    await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'CLOUDBEDS_ACCESS_TOKEN',
        value: newAccessToken,
        type: 'encrypted',
        target: ['production', 'preview']
      })
    })

    // 3. Actualizar CLOUDBEDS_REFRESH_TOKEN en Vercel
    if (newRefreshToken) {
      await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'CLOUDBEDS_REFRESH_TOKEN',
          value: newRefreshToken,
          type: 'encrypted',
          target: ['production', 'preview']
        })
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Token renovado y guardado en Vercel automáticamente',
      timestamp: new Date().toISOString(),
      expires_in: tokenData.expires_in
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
