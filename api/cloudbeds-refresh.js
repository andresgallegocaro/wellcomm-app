export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')

    const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID
    const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET
    const REFRESH_TOKEN = process.env.CLOUDBEDS_REFRESH_TOKEN

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

    if (tokenData.access_token) {
      return res.status(200).json({
        success: true,
        message: 'Token renovado correctamente',
        expires_in: tokenData.expires_in,
        new_access_token_preview: tokenData.access_token.slice(0, 20) + '...'
      })
    } else {
      return res.status(400).json({
        success: false,
        error: tokenData
      })
    }

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
