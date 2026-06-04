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
  return (await res.json()).access_token
}

function normalizar(data) {
  if (!data?.data) return []
  return Array.isArray(data.data) ? data.data : Object.values(data.data)
}

async function traerTodas(headers, url) {
  let todas = []
  let page = 1
  while (page <= 10) {
    const res = await fetch(`${url}&pageSize=100&pageNumber=${page}`, { headers })
    const lista = normalizar(await res.json())
    todas = todas.concat(lista)
    if (lista.length < 100) break
    page++
  }
  return todas
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const token = await getFreshToken()
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    const inicio = '2026-04-01', fin = '2026-04-30'

    // MÉTODO 1: solape (lo que usamos ahora)
    const m1 = await traerTodas(headers, `https://api.cloudbeds.com/api/v1.1/getReservations?checkInTo=${fin}&checkOutFrom=${inicio}`)

    // MÉTODO 2: solo check-in en abril
    const m2 = await traerTodas(headers, `https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=${inicio}&checkInTo=${fin}`)

    // MÉTODO 3: sin filtro de fechas, todas las reservas
    const m3 = await traerTodas(headers, `https://api.cloudbeds.com/api/v1.1/getReservations?`)

    // Para el método 1, contar noches reales en abril (muestra de 30 para no demorar)
    let nochesAbril = 0, ingresosAbril = 0, conDailyRates = 0, sinDailyRates = 0
    for (const r of m1.slice(0, 40)) {
      try {
        const d = (await fetch(`https://api.cloudbeds.com/api/v1.1/getReservation?reservationID=${r.reservationID}`, { headers }).then(x => x.json()))?.data
        if (!d || !['checked_in','checked_out','confirmed'].includes(d.status)) continue
        const asignadas = d.assigned || []
        let tieneRates = false
        asignadas.forEach(a => {
          if (a.dailyRates?.length) tieneRates = true
          ;(a.dailyRates || []).forEach(dr => {
            if (dr.date >= inicio && dr.date <= fin) { nochesAbril++; ingresosAbril += parseFloat(dr.rate||0) }
          })
        })
        if (tieneRates) conDailyRates++; else sinDailyRates++
      } catch {}
    }

    return res.status(200).json({
      metodo1_solape_count: m1.length,
      metodo2_checkin_count: m2.length,
      metodo3_todas_count: m3.length,
      muestra40_de_metodo1: {
        nochesAbril, ingresosAbril,
        reservasConDailyRates: conDailyRates,
        reservasSinDailyRates: sinDailyRates
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
