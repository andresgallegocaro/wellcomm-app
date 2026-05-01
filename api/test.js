module.exports = async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json({
      status: 'ok',
      mensaje: 'API funcionando correctamente',
      env_anthropic: !!process.env.ANTHROPIC_API_KEY,
      env_notion_token: !!process.env.NOTION_TOKEN,
      env_notion_page: !!process.env.NOTION_PAGE_ID,
      node_version: process.version
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
