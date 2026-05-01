export const config = { runtime: 'nodejs', maxDuration: 30 }

const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function getNotionBlocks(pageId) {
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=50`, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
      }
    })
    const data = await res.json()
    if (!data.results) return ''

    let content = ''
    for (const block of data.results) {
      const getText = (obj) => obj?.rich_text?.map(t => t.plain_text).join('') || ''
      if (block.paragraph) content += getText(block.paragraph) + '\n'
      if (block.heading_1) content += '# ' + getText(block.heading_1) + '\n'
      if (block.heading_2) content += '## ' + getText(block.heading_2) + '\n'
      if (block.heading_3) content += '### ' + getText(block.heading_3) + '\n'
      if (block.bulleted_list_item) content += '• ' + getText(block.bulleted_list_item) + '\n'
      if (block.numbered_list_item) content += '- ' + getText(block.numbered_list_item) + '\n'
      if (block.child_page) content += `\n[SECCIÓN: ${block.child_page.title}]\n`
    }
    return content
  } catch (e) {
    return ''
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }

  try {
    const { message, role } = await req.json()

    // Solo leer la página principal (rápido, sin recursión)
    const notionContent = await getNotionBlocks(NOTION_PAGE_ID)

    const systemPrompt = `Eres el Concierge IA interno de WELLcomm Spa & Hotel, un hotel boutique wellness de 25 habitaciones en el barrio Manila, Medellín, Colombia. Gestionado por SOLARA Homes S.A.S.

Responde siempre en español, de forma precisa, profesional y cálida. Eres como el mejor GM del mundo disponible 24/7 para el equipo.

INFORMACIÓN BASE DEL HOTEL:
- Dirección: Carrera 43E #11-37, Manila-Poblado, Medellín
- Teléfono: +57 324 6249064
- Email: frontdesk@wellcommhotels.com
- 25 habitaciones: Estándar (20m²), Superior (22m²), Re-Balance Suite (20m²), WELLcomm Standard Suite (17m²)
- Todas incluyen: cama Queen, A/C, WiFi, minibar, caja fuerte, escritorio, rain shower
- Servicios: Spa (Siana), F&B terraza con pizza (Poster), aromaterapia en check-in, Ochibori
- PMS: Cloudbeds | Revenue: PricePoint | F&B: Poster | Spa: Siana
- Tarifas actuales: COP $320.000 – $500.000 según demanda y tipo de habitación
- Ocupación objetivo: >65% | ADR objetivo: >COP $365.000
- EBITDA mejorado 30% desde Oct 2025
- Venta directa: 25% (objetivo reducir OTAs)
- Check-in incluye aromaterapia (lavanda=relajación, cítricos=energía) + Ochibori

CONTEXTO ADICIONAL DE NOTION:
${notionContent.slice(0, 6000)}

Cuando no tengas información específica, dilo claramente y sugiere consultar con el GM o revisar Notion directamente.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'No pude procesar tu consulta.'

    return new Response(JSON.stringify({ reply }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ reply: `Error: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
