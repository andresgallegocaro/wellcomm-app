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

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }

    // Probamos ABRIL 2026
    const mes = '2026-04'
    const inicio = '2026-04-01'
    const fin = '2026-04-30'

    // Estrategia A: por check-OUT en el mes
    const porCheckout = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?checkOutFrom=${inicio}&checkOutTo=${fin}&pageSize=100`,
      { headers }
    ).then(r => r.json())

    // Estrategia B: por check-IN en el mes
    const porCheckin = await fetch(
      `https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=${inicio}&checkInTo=${fin}&pageSize=100`,
      { headers }
    ).then(r => r.json())

    const listaCheckout = normalizar(porCheckout)
    const listaCheckin = normalizar(porCheckin)

    // Sumar revenue de cada estrategia (con detalle individual de las primeras 5)
    async function sumarRevenue(lista) {
      let total = 0
      const muestra = []
      for (const r of lista.slice(0, 5)) {
        try {
          const dr = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers })
          const d = (await dr.json())?.data
          const t = parseFloat(d?.total || 0)
          total += t
          muestra.push({
            huesped: d?.guestName,
            checkin: d?.startDate,
            checkout: d?.endDate,
            total: t,
            estado: d?.status,
            canal: d?.source
          })
        } catch {}
      }
      return { count: lista.length, totalPrimeras5: total, muestra }
    }

    return res.status(200).json({
      mes,
      estrategiaA_porCheckout: await sumarRevenue(listaCheckout),
      estrategiaB_porCheckin: await sumarRevenue(listaCheckin),
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
