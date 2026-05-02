export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const token = process.env.CLOUDBEDS_ACCESS_TOKEN
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }

    // Obtener datos de Cloudbeds
    const [enCasaRes, llegadasRes, salidasRes] = await Promise.all([
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=not_checked_in&checkIn=${today}&pageSize=25`, { headers }),
      fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&checkOut=${today}&pageSize=25`, { headers }),
    ])

    const [enCasaData, llegadasData, salidasData] = await Promise.all([
      enCasaRes.json(),
      llegadasRes.json(),
      salidasRes.json(),
    ])

    const enCasa = enCasaData?.data || []
    const llegadas = llegadasData?.data || []
    const salidas = salidasData?.data || []

    // Formatear datos para Claude
    const enCasaTexto = enCasa.map(r =>
      `- ${r.guestName || 'Huésped'}, hab. ${r.roomNumber || '—'}, sale el ${r.endDate || '—'}`
    ).join('\n') || 'Sin huéspedes en casa'

    const llegadasTexto = llegadas.map(r =>
      `- ${r.guestName || 'Huésped'}, hab. ${r.roomNumber || '—'}, ${r.nights || '—'} noches, viene de ${r.guestCountry || 'país desconocido'}${r.guestEmail ? `, notas: ${r.notes || 'ninguna'}` : ''}`
    ).join('\n') || 'Sin llegadas hoy'

    const salidasTexto = salidas.map(r =>
      `- ${r.guestName || 'Huésped'}, hab. ${r.roomNumber || '—'}`
    ).join('\n') || 'Sin salidas hoy'

    const ocupacion = Math.round((enCasa.length / 25) * 100)

    // Generar briefing con Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: `Eres el GM de WELLcomm Spa & Hotel, un hotel boutique wellness de 25 habitaciones en Manila, Medellín. 
Generas el briefing diario para el equipo. Tu tono es profesional, cálido y motivador.
El briefing debe ser conciso, claro y útil para el equipo que empieza el turno.
Incluye siempre: saludo con la fecha, resumen de ocupación, alertas de salidas urgentes, bienvenida a llegadas importantes, y un mensaje motivador al final.
Responde en español. Usa emojis con moderación.`,
        messages: [{
          role: 'user',
          content: `Genera el briefing del día ${today} con estos datos:

OCUPACIÓN: ${enCasa.length} de 25 habitaciones (${ocupacion}%)

EN CASA AHORA:
${enCasaTexto}

LLEGADAS HOY:
${llegadasTexto}

SALIDAS HOY:
${salidasTexto}

Genera un briefing profesional y motivador para el equipo de WELLcomm.`
        }]
      })
    })

    const claudeData = await claudeRes.json()
    const briefing = claudeData.content?.[0]?.text || 'No se pudo generar el briefing.'

    return res.status(200).json({
      fecha: today,
      ocupacion,
      enCasa: enCasa.length,
      llegadas: llegadas.length,
      salidas: salidas.length,
      briefing,
      llegadasDetalle: llegadas.map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        noches: r.nights || '—',
        pais: r.guestCountry || '—',
        hora: r.estimatedArrivalTime || '—',
        notas: r.notes || ''
      })),
      salidasDetalle: salidas.map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
      })),
      enCasaDetalle: enCasa.map(r => ({
        nombre: r.guestName || 'Huésped',
        habitacion: r.roomNumber || '—',
        salida: r.endDate || '—',
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
