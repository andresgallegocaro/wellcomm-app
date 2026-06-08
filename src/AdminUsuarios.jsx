import { useState, useEffect } from 'react'

const C = {
  bg: '#E8F0EC', dark: '#1A1A1A', primary: '#7EC8A0', primaryDark: '#5aaa80',
  muted: '#7a8c82', light: '#d0ddd5', white: '#FFFFFF',
}

const NIVEL_INFO = {
  direccion: { label: 'Dirección', color: '#3498db', desc: 'Acceso total' },
  propietario: { label: 'Propietario', color: '#9b59b6', desc: 'Solo finanzas' },
  staff: { label: 'Staff', color: '#16a085', desc: 'Solo operación' },
}

export default function AdminUsuarios({ adminPin, onBack }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', pin: '', nivel: 'staff' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar', adminPin })
      })
      const d = await res.json()
      if (d.ok) setUsuarios(d.usuarios)
    } finally { setLoading(false) }
  }

  async function crear() {
    if (!form.nombre || form.pin.length < 4) { setMsg('Nombre y PIN (mín. 4 dígitos) requeridos'); return }
    setGuardando(true); setMsg('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'crear', adminPin, ...form })
      })
      const d = await res.json()
      if (d.ok) { setUsuarios(d.usuarios); setForm({ nombre: '', pin: '', nivel: 'staff' }); setMsg('✓ Usuario creado') }
      else setMsg(d.error || 'Error al crear')
    } finally { setGuardando(false) }
  }

  async function guardarEdicion() {
    setGuardando(true); setMsg('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar', adminPin, id: editId, cambios: editForm })
      })
      const d = await res.json()
      if (d.ok) { setUsuarios(d.usuarios); setEditId(null); setEditForm(null); setMsg('✓ Cambios guardados') }
      else setMsg(d.error || 'Error al editar')
    } finally { setGuardando(false) }
  }

  async function eliminar(id) {
    setGuardando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', adminPin, id })
      })
      const d = await res.json()
      if (d.ok) setUsuarios(d.usuarios)
    } finally { setGuardando(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-body)' }}>
      <div style={{ background: C.dark, padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: C.primary, fontSize: 16, letterSpacing: 3, fontWeight: 700, fontFamily: 'var(--font-display)' }}>WELLCOMM</div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>⚙️ Gestión de usuarios</div>
          </div>
          <button onClick={onBack} style={{ background: 'none', border: `1px solid #444`, borderRadius: 8, color: '#aaa', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.75rem' }}>← Volver</button>
        </div>
      </div>

      <div style={{ padding: '1.25rem', maxWidth: 600, margin: '0 auto' }}>
        {/* Crear nuevo usuario */}
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', border: `1px solid ${C.light}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Crear nuevo usuario</div>

          <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>Nombre</label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Amalia"
            style={{ width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }} />

          <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>PIN (4-6 dígitos)</label>
          <input type="text" inputMode="numeric" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="Ej: 2024"
            style={{ width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }} />

          <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>Nivel de acceso</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {Object.entries(NIVEL_INFO).map(([key, info]) => (
              <button key={key} onClick={() => setForm({ ...form, nivel: key })} style={{
                flex: 1, padding: '0.6rem 0.4rem', borderRadius: 8, cursor: 'pointer',
                border: form.nivel === key ? `2px solid ${info.color}` : `1px solid ${C.light}`,
                background: form.nivel === key ? `${info.color}15` : C.white,
                fontFamily: 'var(--font-body)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: info.color }}>{info.label}</div>
                <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: '0.15rem' }}>{info.desc}</div>
              </button>
            ))}
          </div>

          <button onClick={crear} disabled={guardando} style={{ width: '100%', background: C.dark, color: 'white', border: 'none', borderRadius: 10, padding: '0.8rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            {guardando ? 'Guardando...' : '+ Crear usuario'}
          </button>
          {msg && <div style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem', color: msg.startsWith('✓') ? C.primaryDark : '#e74c3c' }}>{msg}</div>}
        </div>

        {/* Lista de usuarios */}
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>
            Equipo y propietarios ({usuarios.length})
          </div>

          {loading && <div style={{ color: C.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>Cargando...</div>}

          {!loading && usuarios.length === 0 && (
            <div style={{ color: C.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
              Aún no hay usuarios. Crea el primero arriba.
            </div>
          )}

          {usuarios.map((u, i) => (
            editId === u.id ? (
              <div key={u.id} style={{ border: `2px solid ${C.primary}`, borderRadius: 10, padding: '0.85rem', marginBottom: '0.6rem' }}>
                <input value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.82rem', marginBottom: '0.5rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                <input type="text" inputMode="numeric" value={editForm.pin} onChange={e => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  style={{ width: '100%', padding: '0.5rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.82rem', marginBottom: '0.5rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {Object.entries(NIVEL_INFO).map(([key, info]) => (
                    <button key={key} onClick={() => setEditForm({ ...editForm, nivel: key })} style={{
                      flex: 1, padding: '0.4rem', borderRadius: 7, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                      border: editForm.nivel === key ? `2px solid ${info.color}` : `1px solid ${C.light}`,
                      background: editForm.nivel === key ? `${info.color}15` : C.white, color: info.color, fontFamily: 'var(--font-body)'
                    }}>{info.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setEditId(null); setEditForm(null) }} style={{ flex: 1, background: C.bg, color: C.muted, border: `1px solid ${C.light}`, borderRadius: 7, padding: '0.5rem', fontSize: '0.78rem', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={guardarEdicion} disabled={guardando} style={{ flex: 2, background: C.dark, color: 'white', border: 'none', borderRadius: 7, padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
                </div>
              </div>
            ) : (
              <div key={u.id} style={{ padding: '0.7rem 0', borderBottom: i < usuarios.length - 1 ? `1px solid ${C.light}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{u.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.62rem', background: `${NIVEL_INFO[u.nivel]?.color}22`, color: NIVEL_INFO[u.nivel]?.color, padding: '0.1rem 0.5rem', borderRadius: 10 }}>{NIVEL_INFO[u.nivel]?.label}</span>
                    <span style={{ fontSize: '0.68rem', color: C.muted }}>PIN: {u.pin}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button onClick={() => { setEditId(u.id); setEditForm({ nombre: u.nombre, pin: u.pin, nivel: u.nivel }) }} style={{ background: 'none', border: 'none', color: C.primaryDark, fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Editar</button>
                  <button onClick={() => eliminar(u.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.7rem', cursor: 'pointer' }}>Eliminar</button>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
