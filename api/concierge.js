const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

// Base de datos "Protocolos y Conocimiento" en Notion
const PROTOCOLOS_DB_ID = '7f477e31ae194bd3b228860199348184'

async function kvGet(key) {
  try {
    const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    })
    const data = await res.json()
    if (data.result === null || data.result === undefined) return null
    let result = data.result
    while (typeof result === 'string') {
      try { result = JSON.parse(result) } catch { break }
    }
    return result
  } catch (e) { return null }
}

async function kvSet(key, value) {
  const encoded = encodeURIComponent(JSON.stringify(value))
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encoded}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  })
}

// Lee los protocolos activos de Notion, con caché de 10 min
async function getProtocolos(NOTION_TOKEN) {
  // 1. Intentar caché
  const cache = await kvGet('protocolos_cache')
  if (cache && cache.ts && (Date.now() - cache.ts < 10 * 60 * 1000)) {
    return cache.texto
  }

  // 2. Leer de Notion en vivo
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${PROTOCOLOS_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'Activo', checkbox: { equals: true } },
        page_size: 100,
      })
    })
    const data = await res.json()
    if (!data.results) return ''

    const getText = (rt) => (rt || []).map(t => t.plain_text).join('')
    let texto = ''
    const porCategoria = {}

    for (const page of data.results) {
      const props = page.properties || {}
      const titulo = getText(props.Titulo?.title)
      const categoria = props.Categoria?.select?.name || 'General'
      const contenido = getText(props.Contenido?.rich_text)
      if (!titulo && !contenido) continue
      if (!porCategoria[categoria]) porCategoria[categoria] = []
      porCategoria[categoria].push(`• ${titulo}: ${contenido}`)
    }

    for (const [cat, items] of Object.entries(porCategoria)) {
      texto += `\n## ${cat}\n${items.join('\n')}\n`
    }

    // 3. Guardar en caché
    await kvSet('protocolos_cache', { texto, ts: Date.now() })
    return texto
  } catch (e) {
    return ''
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    const NOTION_TOKEN = process.env.NOTION_TOKEN

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { message } = body

    // Leer protocolos reales de Notion
    const protocolos = await getProtocolos(NOTION_TOKEN)

    const systemPrompt = `Eres el Concierge IA interno de WELLcomm Spa & Hotel, un hotel boutique wellness de 25 habitaciones en Manila, El Poblado, Medellín. Gestionado por SOLARA. Responde siempre en español, de forma precisa, cálida y profesional.

INSTRUCCIÓN CLAVE: Responde basándote PRIMERO Y SOBRE TODO en los PROTOCOLOS Y CONOCIMIENTO OFICIAL de WELLcomm que aparecen abajo. Esa es la información real y verificada del hotel. Si la respuesta está ahí, úsala tal cual. Si te preguntan algo que NO está en los protocolos, dilo claramente ("Eso aún no está documentado en nuestros protocolos, te recomiendo confirmarlo con tu líder de área") en lugar de inventar. Nunca te inventes procedimientos, tarifas ni datos.

DATOS GENERALES DEL HOTEL:
- Dirección: Carrera 43E #11-37, El Poblado, Medellín
- 25 habitaciones: Estándar, Superior, Suite Ejecutiva, Suite Presidencial
- Spa AKEN (circuito termal), The Terrace (F&B)
- PMS: Cloudbeds

═══════════════════════════════
PROTOCOLOS Y CONOCIMIENTO OFICIAL DE WELLCOMM
(Esta información viene en vivo de la base de datos de la empresa)
═══════════════════════════════
${protocolos || 'Aún no hay protocolos documentados. Indica al usuario que la base de conocimiento está en construcción.'}
═══════════════════════════════`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    })

    const claudeData = await claudeRes.json()
    const reply = claudeData.content?.[0]?.text || 'No pude procesar tu consulta.'
    return res.status(200).json({ reply })

  } catch (error) {
    return res.status(500).json({ reply: `Error: ${error.message}` })
  }
}
