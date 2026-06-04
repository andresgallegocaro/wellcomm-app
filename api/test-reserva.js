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
    const en30dias = new Date()
    en30dias.setDate(en30dias.getDate() + 30)
    const futuroStr = en30dias.toISOString().split('T')[0]

    // Probar 4 estrategias distintas
    const [r1, r2, r3, r4] = await Promise.all([
      // Estrategia 1: status confirmed
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=confirmed&pageSize=10`, { headers }).then(r => r.json()),
      // Estrategia 2: solo rango de fechas futuras sin status
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=${today}&checkInTo=${futuroStr}&pageSize=10`, { headers }).then(r => r.json()),
      // Estrategia 3: status=not_checked_in con rango futuro
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkInFrom=${today}&checkInTo=${futuroStr}&pageSize=10`, { headers }).then(r => r.json()),
      // Estrategia 4: sin filtro de status, solo fecha salida futura
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?checkOutFrom=${today}&checkOutTo=${futuroStr}&pageSize=10`, { headers }).then(r => r.json()),
    ])

    const contar = (data) => {
      const d = data?.data
      if (!d) return { total: 0, primerStatus: null }
      const lista = Array.isArray(d) ? d : Object.values(d)
      return {
        total: lista.length,
        primerStatus: lista[0]?.status || null,
        primerNombre: lista[0]?.guestName || null,
        primerCheckIn: lista[0]?.startDate || lista[0]?.checkIn || null
      }
    }

    return res.status(200).json({
      today,
      futuroStr,
      estrategia1_confirmed: contar(r1),
      estrategia2_rango_sin_status: contar(r2),
      estrategia3_not_checked_in_rango: contar(r3),
      estrategia4_checkout_futuro: contar(r4),
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
