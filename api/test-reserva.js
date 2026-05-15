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

    const listaRes = await fetch(
      'https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=3',
      { headers }
    )
    const listaData = await listaRes.json()
    const lista = listaData?.data || []
    const primera = lista[0]

    const detalleRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${primera.reservationID}`,
      { headers }
    )
    const detalleJson = await detalleRes.json()
    const d = detalleJson?.data

    // Solo los campos de dinero — para ver exactamente qué llega
    return res.status(200).json({
      reservationID: primera.reservationID,
      roomTotal_raw: d.roomTotal,
      roomTotal_tipo: typeof d.roomTotal,
      roomTotal_parsed: parseFloat(d.roomTotal || 0),
      startDate: d.startDate,
      endDate: d.endDate,
      grandTotal: d.grandTotal,
      subTotal: d.subTotal,
      total: d.total,
      nights_dailyRates: d.dailyRates?.length,
      sourceName: d.sourceName,
      source: d.source,
      roomName: d.roomName
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
