const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN

const ADMIN_PIN = '1450'

const NIVELES = {
  direccion: { label: 'Dirección', acceso: ['dashboard', 'revenue', 'propietario', 'operacion', 'admin', 'auditoria'] },
  lider: { label: 'Líder', acceso: ['operacion', 'auditoria', 'revenue', 'dashboard'] },
  propietario: { label: 'Propietario', acceso: ['propietario', 'revenue'] },
  staff: { label: 'Staff', acceso: ['operacion'] },
}

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

async function getUsuarios() {
  const lista = await kvGet('usuarios_wellcomm')
  return Array.isArray(lista) ? lista : []
}

async function setUsuarios(lista) {
  await kvSet('usuarios_wellcomm', lista)
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const body = req.method === 'POST'
      ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
      : {}

    if (req.method === 'POST' && body.action === 'login') {
      const pin = String(body.pin || '')

      if (pin === ADMIN_PIN) {
        return res.status(200).json({
          ok: true,
          usuario: { nombre: 'Andi', nivel: 'direccion', esAdmin: true },
          acceso: NIVELES.direccion.acceso
        })
      }

      const usuarios = await getUsuarios()
      const u = usuarios.find(x => x.pin === pin && x.activo !== false)
      if (!u) return res.status(401).json({ error: 'PIN incorrecto' })

      return res.status(200).json({
        ok: true,
        usuario: { nombre: u.nombre, nivel: u.nivel, esAdmin: false },
        acceso: NIVELES[u.nivel]?.acceso || []
      })
    }

    if (req.method === 'POST' && body.action === 'listar') {
      if (String(body.adminPin) !== ADMIN_PIN) return res.status(403).json({ error: 'No autorizado' })
      const usuarios = await getUsuarios()
      return res.status(200).json({ ok: true, usuarios, niveles: NIVELES })
    }

    if (req.method === 'POST' && body.action === 'crear') {
      if (String(body.adminPin) !== ADMIN_PIN) return res.status(403).json({ error: 'No autorizado' })
      const { nombre, pin, nivel } = body
      if (!nombre || !pin || !nivel) return res.status(400).json({ error: 'Faltan datos' })

      const usuarios = await getUsuarios()
      if (pin === ADMIN_PIN || usuarios.some(u => u.pin === pin)) {
        return res.status(400).json({ error: 'Ese PIN ya está en uso' })
      }
      usuarios.push({ id: Date.now(), nombre, pin: String(pin), nivel, activo: true, creado: new Date().toISOString() })
      await setUsuarios(usuarios)
      return res.status(200).json({ ok: true, usuarios })
    }

    if (req.method === 'POST' && body.action === 'editar') {
      if (String(body.adminPin) !== ADMIN_PIN) return res.status(403).json({ error: 'No autorizado' })
      const { id, cambios } = body
      const usuarios = await getUsuarios()
      if (cambios.pin) {
        if (cambios.pin === ADMIN_PIN || usuarios.some(u => u.pin === cambios.pin && u.id !== id)) {
          return res.status(400).json({ error: 'Ese PIN ya está en uso' })
        }
      }
      const actualizados = usuarios.map(u => u.id === id ? { ...u, ...cambios, pin: String(cambios.pin || u.pin) } : u)
      await setUsuarios(actualizados)
      return res.status(200).json({ ok: true, usuarios: actualizados })
    }

    if (req.method === 'POST' && body.action === 'eliminar') {
      if (String(body.adminPin) !== ADMIN_PIN) return res.status(403).json({ error: 'No autorizado' })
      const { id } = body
      const usuarios = await getUsuarios()
      const filtrados = usuarios.filter(u => u.id !== id)
      await setUsuarios(filtrados)
      return res.status(200).json({ ok: true, usuarios: filtrados })
    }

    return res.status(400).json({ error: 'Acción no válida' })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
