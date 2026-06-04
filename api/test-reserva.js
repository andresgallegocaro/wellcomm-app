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
  return data.access_token
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    const today = new Date().toISOString().split('T')[0]

    // Llegada de hoy
    const llegadasRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&checkInFrom=${today}&checkInTo=${today}&pageSize=5`,
      { headers }
    )
    const llegadasData = await llegadasRes.json()
    const lista = Array.isArray(llegadasData?.data)
      ? llegadasData.data
      : Object.values(llegadasData?.data || {})

    if (lista.length === 0) {
      return res.status(200).json({ error: 'No hay llegadas hoy', llegadasData })
    }

    const primera = lista[0]

    // Detalle individual de esa llegada
    const detalleRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${primera.reservationID}`,
      { headers }
    )
    const detalleData = await detalleRes.json()

    return res.status(200).json({
      reservationID: primera.reservationID,
      // Qué trae la lista
      enLista: primera,
      // Qué trae el detalle (todos los campos)
      enDetalle: detalleData?.data,
      httpStatus: detalleRes.status
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
