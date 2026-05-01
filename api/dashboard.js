export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()

    const ACCESS_TOKEN = process.env.CLOUDBEDS_ACCESS_TOKEN
    const today = new Date().toISOString().split('T')[0]

    const headers = {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Fetch en paralelo
    const [enCasaRes, llegadasRes, salidasRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=100`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkIn=${today}&pageSize=100`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOut=${today}&pageSize=100`, { headers }),
    ])

    const [enCasaData, llegadasData, salidasData] = await Promise.all([
      enCasaRes.json(),
      llegadasRes.json(),
      salidasRes.json(),
    ])

    const enCasa = enCasaData?.data?.length || 0
    const llegadas = llegadasData?.data?.length || 0
    const salidas = salidasData?.data?.length || 0
    const totalHabitaciones = 25
    const ocupacion = Math.round((enCasa / totalHabitaciones) * 100)

    let totalRevenue = 0
    if (enCasaData?.data?.length > 0) {
      enCasaData.data.forEach(r => {
        totalRevenue += parseFloat(r.grandTotal || r.totalPrice || r.balance || 0)
      })
    }

    const adr = enCasa > 0 ? Math.round(totalRevenue / enCasa) : 0
    const revpar = Math.round((ocupacion / 100) * adr)

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa,
      llegadas,
      salidas,
      totalHabitaciones,
      adr,
      revpar,
      llegadasDetalle: (llegadasData?.data || []).slice(0, 10).map(r => ({
        nombre: r.guestName || `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim() || 'Huésped',
        habitacion: r.roomNumber || r.assignedRoom || r.roomTypeNameShort || '—',
        noches: r.nights || '—',
        total: parseFloat(r.grandTotal || r.totalPrice || 0)
      })),
      enCasaDetalle: (enCasaData?.data || []).slice(0, 10).map(r => ({
        nombre: r.guestName || `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim() || 'Huésped',
        habitacion: r.roomNumber || r.assignedRoom || r.roomTypeNameShort || '—',
        salida: r.endDate || r.checkOut || '—',
        total: parseFloat(r.grandTotal || r.totalPrice || 0)
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
