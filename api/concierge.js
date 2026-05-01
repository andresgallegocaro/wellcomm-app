export const config = { runtime: 'nodejs' }

const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function getNotionContent(pageId) {
  const cleanId = pageId.replace(/-/g, '')
  
  // Obtener sub-páginas
  const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${cleanId}/children?page_size=100`, {
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    }
  })
  
  const blocks = await blocksRes.json()
  let content = ''
  
  if (!blocks.results) return content
  
  for (const block of blocks.results) {
    // Texto simple
    if (block.paragraph?.rich_text?.length > 0) {
      content += block.paragraph.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    if (block.heading_1?.rich_text?.length > 0) {
      content += '# ' + block.heading_1.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    if (block.heading_2?.rich_text?.length > 0) {
      content += '## ' + block.heading_2.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    if (block.heading_3?.rich_text?.length > 0) {
      content += '### ' + block.heading_3.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    if (block.bulleted_list_item?.rich_text?.length > 0) {
      content += '• ' + block.bulleted_list_item.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    if (block.numbered_list_item?.rich_text?.length > 0) {
      content += '- ' + block.numbered_list_item.rich_text.map(t => t.plain_text).join('') + '\n'
    }
    
    // Si es una sub-página, obtener su contenido también
    if (block.type === 'child_page' && block.id) {
      const subContent = await getNotionContent(block.id)
      content += `\n=== ${block.child_page.title} ===\n${subContent}\n`
    }
  }
  
  return content
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
    
    // Obtener contexto de Notion
    const notionContent = await getNotionContent(NOTION_PAGE_ID)
    
    const systemPrompt = role === 'staff' 
      ? `Eres el Concierge IA interno de WELLcomm Spa & Hotel, un hotel boutique wellness de 25 habitaciones en el barrio Manila, Medellín, gestionado por SOLARA Homes.

Tienes acceso completo a toda la documentación operativa del hotel en Notion. Responde siempre en español, de forma precisa, profesional y útil. Eres como el mejor GM del mundo disponible 24/7 para el equipo.

Cuando no tengas información específica en el contexto, dilo claramente y sugiere a quién consultar.

CONTEXTO COMPLETO DEL HOTEL EN NOTION:
${notionContent.slice(0, 15000)}

Información clave del hotel:
- Dirección: Carrera 43E #11-37, Manila-Poblado, Medellín
- Teléfono: +57 324 6249064
- Email: frontdesk@wellcommhotels.com
- 25 habitaciones (Estándar 20m², Superior 22m², Re-Balance Suite, WELLcomm Standard Suite)
- Servicios: Spa (Siana), F&B (Poster), terraza con pizza
- PMS: Cloudbeds
- Revenue tool: PricePoint
- Gestionado por: SOLARA Homes S.A.S.`
      : `Eres el Concierge IA de WELLcomm Spa & Hotel para huéspedes. Eres cálido, wellness-oriented y conoces todos los servicios del hotel. Responde en español.

CONTEXTO:
${notionContent.slice(0, 8000)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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
    return new Response(JSON.stringify({ reply: 'Error interno. Intenta de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
