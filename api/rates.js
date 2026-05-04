const COMPETENCIA = [
  { nombre: 'WELLcomm Spa & Hotel', trivago_id: null, es_nosotros: true },
  { nombre: 'Botánica Casa Hotel Manila', trivago_id: null },
  { nombre: 'Celestino Boutique Hotel & Spa', trivago_id: null },
  { nombre: 'Golden Valley Hotel', trivago_id: null },
  { nombre: 'Landmark Hotel', trivago_id: null },
  { nombre: 'Moabi Hotel', trivago_id: null },
  { nombre: 'Nomada Hotel Origen', trivago_id: null },
  { nombre: 'Sloh Hotel & Bar Manila', trivago_id: null },
  { nombre: 'The Host Medellin Adults Only', trivago_id: null },
  { nombre: 'The Somos Bold', trivago_id: null },
]

// Precios base estimados por hotel (actualizados manualmente hasta tener API)
// En COP por noche, 1 habitación doble
const PRECIOS_BASE = {
  'WELLcomm Spa & Hotel': { min: 320000, max: 500000, rating: 4.8 },
  'Botánica Casa Hotel Manila': { min: 280000, max: 420000, rating: 4.7 },
  'Celestino Boutique Hotel & Spa': { min: 350000, max: 550000, rating: 4.9 },
  'Golden Valley Hotel': { min: 200000, max: 320000, rating: 4.3 },
  'Landmark Hotel': { min: 180000, max: 280000, rating: 4.1 },
  'Moabi Hotel': { min: 250000, max: 380000, rating: 4.5 },
  'Nomada Hotel Origen': { min: 290000, max: 440000, rating: 4.6 },
  'Sloh Hotel & Bar Manila': { min: 310000, max: 480000, rating: 4.7 },
  'The Host Medellin Adults Only': { min: 270000, max: 410000, rating: 4.6 },
  'The Somos Bold': { min: 330000, max: 500000, rating: 4.8 },
}

function getPrecioSimulado(hotel, fecha, ocupacionActual) {
  const base = PRECIOS_BASE[hotel]
  if (!base) return null

  const d = new Date(fecha)
  const diaSemana = d.getDay()
  const esFinDeSemana = diaSemana === 5 || diaSemana === 6 || diaSemana === 0

  // Factor demanda por ocupación
  let factorOcupacion = 1.0
  if (ocupacionActual > 80) factorOcupacion = 1.3
  else if (ocupacionActual > 60) factorOcupacion = 1.1
  else if (ocupacionActual < 30) factorOcupacion = 0.85

  // Factor fin de semana
  const factorFDS = esFinDeSemana ? 1.2 : 1.0

  // Variación aleatoria pequeña por hotel (±5%)
  const variacion = 0.95 + (Math.random() * 0.10)

  const precio = Math.round(
    ((base.min + base.max) / 2) * factorOcupacion * factorFDS * variacion / 1000
  ) * 1000

  return {
    precio,
    min: Math.round(base.min * factorOcupacion * factorFDS),
    max: Math.round(base.max * factorOcupacion * factorFDS),
    rating: base.rating,
    esFinDeSemana,
    disponible: Math.random() > 0.1
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    // Obtener ocupación actual de Cloudbeds
    const token = process.env.CLOUDBEDS_ACCESS_TOKEN
    let ocupacionActual = 50
    let adrActual = 365000
    try {
      const cbRes = await fetch(`https://api.cloudbeds.com/api/v1.1/getReservations?status=checked_in&pageSize=25`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      })
      const cbData = await cbRes.json()
      const enCasa = cbData?.data?.length || 0
      ocupacionActual = Math.round((enCasa / 25) * 100)
      const totalRev = (cbData?.data || []).reduce((acc, r) => acc + parseFloat(r.grandTotal || 0), 0)
      adrActual = enCasa > 0 ? Math.round(totalRev / enCasa) : 365000
    } catch (e) {}

    // Generar precios para los próximos 7 días
    const hoy = new Date()
    const fechas = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })

    // Construir tabla de precios por hotel por fecha
    const tabla = fechas.map(fecha => {
      const hoteles = COMPETENCIA.map(hotel => {
        const datos = getPrecioSimulado(hotel.nombre, fecha, ocupacionActual)
        return {
          nombre: hotel.nombre,
          es_nosotros: hotel.es_nosotros || false,
          ...datos
        }
      })

      // Calcular posición de WELLcomm
      const nosotros = hoteles.find(h => h.es_nosotros)
      const competencia = hoteles.filter(h => !h.es_nosotros && h.disponible)
      const preciosMercado = competencia.map(h => h.precio)
      const mediasMercado = preciosMercado.length > 0
        ? Math.round(preciosMercado.reduce((a, b) => a + b, 0) / preciosMercado.length)
        : 0

      const posicion = nosotros.precio > mediasMercado
        ? 'por_encima' : nosotros.precio < mediasMercado
        ? 'por_debajo' : 'igual'

      const diff = mediasMercado > 0
        ? Math.round(((nosotros.precio - mediasMercado) / mediasMercado) * 100)
        : 0

      return {
        fecha,
        hoteles,
        mediasMercado,
        nosotros: nosotros.precio,
        posicion,
        diff,
        alerta: Math.abs(diff) > 20
      }
    })

    // Resumen general
    const alertas = tabla.filter(t => t.alerta)
    const diasPorEncima = tabla.filter(t => t.posicion === 'por_encima').length
    const diasPorDebajo = tabla.filter(t => t.posicion === 'por_debajo').length

    return res.status(200).json({
      actualizado: new Date().toISOString(),
      ocupacionActual,
      adrActual,
      tabla,
      resumen: {
        diasPorEncima,
        diasPorDebajo,
        diasIgual: tabla.length - diasPorEncima - diasPorDebajo,
        alertas: alertas.length,
        posicionGeneral: diasPorEncima > diasPorDebajo ? 'premium' : diasPorDebajo > diasPorEncima ? 'economico' : 'competitivo'
      }
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
