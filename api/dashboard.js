export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()

    const CLOUDBEDS_API_KEY = process.env.CLOUDBEDS_API_KEY
    const today = new Date().toISOString().split('T')[0]

    // Probar primero con getHotels para verificar autenticación
    const testRes = await fetch('https://api.cloudbeds.com/api/v1.1/getHotels', {
      headers: {
        'Authorization': `apikey ${CLOUDBEDS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    const testText = await testRes.text()
    
    // Intentar parsear
    let testData
    try {
      testData = JSON.parse(testText)
    } catch(e) {
      return res.status(200).json({ 
        debug: true,
        error: 'Cloudbeds no devuelve JSON',
        status: testRes.status,
        respuesta_raw: testText.slice(0, 500)
      })
    }

    return res.status(200).json({
      debug: true,
      status: testRes.status,
      data: testData
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
