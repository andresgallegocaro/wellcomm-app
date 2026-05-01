module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    const NOTION_TOKEN = process.env.NOTION_TOKEN
    const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID

    const { message } = req.body

    // Leer Notion
    let notionContent = ''
    try {
      const notionRes = await fetch(`https://api.notion.com/v1/blocks/${NOTION_PAGE_ID}/children?page_size=30`, {
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
        }
      })
      const notionData = await notionRes.json()
      if (notionData.results) {
        for (const block of notionData.results) {
          const getText = (obj) => obj?.rich_text?.map(t => t.plain_text).join('') || ''
          if (block.paragraph) notionContent += getText(block.paragraph) + '\n'
          if (block.heading_1) notionContent += '# ' + getText(block.heading_1) + '\n'
          if (block.heading_2) notionContent += '## ' + getText(block.heading_2) + '\n'
          if (block.bulleted_list_item) notionContent += '• ' + getText(block.bulleted_list_item) + '\n'
          if (block.child_page) notionContent += `[SECCIÓN: ${block.child_page.title}]\n`
        }
      }
    } catch (e) {
      notionContent = 'No se pudo cargar Notion.'
    }

    const systemPrompt = `Eres el Concierge IA interno de WELLcomm Spa & Hotel, un hotel boutique wellness de 25 habitaciones en Manila, Medellín. Gestionado por SOLARA Homes S.A.S. Responde siempre en español, de forma precisa y profesional.

INFORMACIÓN DEL HOTEL:
- Dirección: Carrera 43E #11-37, Manila-Poblado, Medellín
- Tel: +57 324 6249064 | Email: frontdesk@wellcommhotels.com
- Habitaciones: Estándar (20m²), Superior (22m²), Re-Balance Suite (20m²), WELLcomm Standard Suite (17m²)
- Todas incluyen: cama Queen, A/C, WiFi, minibar, caja fuerte, rain shower
- Servicios: Spa Siana, terraza con pizza (Poster), aromaterapia en check-in, Ochibori
- PMS: Cloudbeds | Revenue: PricePoint | F&B: Poster | Spa: Siana
- Tarifas: COP $320.000 – $500.000 según demanda
- Ocupación objetivo: >65% | ADR objetivo: >COP $365.000
- EBITDA mejorado 30% desde Oct 2025
- Venta directa: 25% del total

CONTEXTO NOTION:
${notionContent.slice(0, 4000)}`

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
