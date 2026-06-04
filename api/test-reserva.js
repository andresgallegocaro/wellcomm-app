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

    // TEST 1: reservas futuras (On the Books)
    const futuraRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&pageSize=10`,
      { headers }
    )
    const futuraData = await futuraRes.json()

    // TEST 2: llegadas hoy
    const llegadasRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkInFrom=${today}&checkInTo=${today}&pageSize=10`,
      { headers }
    )
    const llegadasData = await llegadasRes.json()

    // TEST 3: campos de la primera reserva en casa
    const enCasaRes = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=3`,
      { headers }
    )
    const enCasaData = await enCasaRes.json()
    const primera = Array.isArray(enCasaData?.data)
      ? enCasaData.data[0]
      : Object.values(enCasaData?.data || {})[0]

    let detalleHabitacion = null
    if (primera?.reservationID) {
      const dr = await fetch(
        `https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${primera.reservationID}`,
        { headers }
      )
      const dj = await dr.json()
      const d = dj?.data
      detalleHabitacion = {
        roomName: d?.roomName,
        roomNumber: d?.roomNumber,
        roomID: d?.roomID,
        rooms: d?.rooms,
        assigned: d?.assigned
      }
    }

    return res.status(200).json({
      today,
      futuras: {
        total: Array.isArray(futuraData?.data)
          ? futuraData.data.length
          : Object.keys(futuraData?.data || {}).length,
        esArray: Array.isArray(futuraData?.data),
        muestra: Array.isArray(futuraData?.data)
          ? futuraData.data.slice(0, 2)
          : Object.values(futuraData?.data || {}).slice(0, 2)
      },
      llegadasHoy: {
        total: Array.isArray(llegadasData?.data)
          ? llegadasData.data.length
          : Object.keys(llegadasData?.data || {}).length,
        muestra: Array.isArray(llegadasData?.data)
          ? llegadasData.data.slice(0, 2)
          : Object.values(llegadasData?.data || {}).slice(0, 2)
      },
      habitacion: detalleHabitacion
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
