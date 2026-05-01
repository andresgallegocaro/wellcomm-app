module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ 
    status: 'ok', 
    mensaje: 'API funcionando',
    env_anthropic: !!process.env.ANTHROPIC_API_KEY,
    env_notion: !!process.env.NOTION_TOKEN,
  })
}
