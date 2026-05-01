export default async function handler(req, res) {
  try {
    const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID
    const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET
    const CODE = req.query.code || '9wZabXXFGGUk2o-H6BEXVB7KWLZt6TGU2dIoou-e5n8'

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'https://wellcomm-app.vercel.app',
      code: CODE
    })

    const tokenRes = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const tokenData = await tokenRes.json()
    return res.status(200).json(tokenData)

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
