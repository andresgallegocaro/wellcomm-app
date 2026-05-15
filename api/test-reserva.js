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

    // PASO 1: traer la lista para obtener un reservationID real
    const listaRes = await fetch(
      'https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=3',
      { headers }
    )
    const listaData = await listaRes.json()
    const lista = listaData?.data || []

    if (lista.length === 0) {
      return res.status(200).json({ error: 'No hay reservas en casa', listaData })
    }

    // PASO 2: tomar la primera reserva y ver TODOS sus campos
    const primeraReserva = lista[0]
    const reservationID = primeraReserva.reservationID

    // PASO 3: pedir el detalle individual
    const detalleRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${reservationID}`,
      { headers }
    )
    const detalleData = await detalleRes.json()

    // Devolver TODO para ver qué campos existen
    return res.status(200).json({
      reservationID,
      camposEnLista: primeraReserva,       // qué manda getReservations
      camposEnDetalle: detalleData?.data,  // qué manda getReservation
      httpStatusDetalle: detalleRes.status
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
