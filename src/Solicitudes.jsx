import React, { useState, useEffect } from 'react'

const TIPOS = [
  { id: 'amenities', label: 'Amenities', emoji: '🧴' },
  { id: 'toallas', label: 'Toallas / Ropa de cama', emoji: '🛏️' },
  { id: 'limpieza', label: 'Limpieza habitación', emoji: '🧹' },
  { id: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧' },
  { id: 'alimentos', label: 'Alimentos / Bebidas', emoji: '🍽️' },
  { id: 'spa', label: 'Reserva Spa', emoji: '💆' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'informacion', label: 'Información', emoji: 'ℹ️' },
  { id: 'otro', label: 'Otro', emoji: '📋' },
]

const EMPLEADOS = ['Andrés', 'David', 'Catalina', 'María', 'José']

const ESTADOS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#e67e22', bg: '#FFF8F0', emoji: '⏳' },
  en_proceso: { label: 'En proceso', color: '#3498db', bg: '#F0F8FF', emoji: '🔄' },
  completado: { label: 'Completado', color: '#7EC8A0', bg: '#E8F5EE', emoji: '✅' },
  cancelado: { label: 'Cancelado', color: '#95a5a6', bg: '#F5F5F5', emoji: '❌' },
}

export default function Solicitudes({ onBack }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('pendiente')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    habitacion: '',
    huesped: '',
    tipo: 'amenities',
    descripcion: '',
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/solicitudes')
      const data = await res.json()
      setSolicitudes(data.solicitudes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    if (!form.habitacion || !form.tipo) return
    setSaving(true)
    try {
      await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, origen: 'equipo' })
      })
      setForm({ habitacion: '', huesped: '', tipo: 'amenities', descripcion: '' })
      setShowForm(false)
      await cargar()
    } finally {
      setSaving(false)
    }
  }

  async function actualizarEstado(id, estado, asignadoA) {
    await fetch('/api/solicitudes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado, asignadoA })
    })
    await cargar()
    setSelected(null)
  }

  function tiempoTranscurrido(fecha) {
    const diff = (Date.now() - new Date(fecha)) / 60000
    if (diff < 60) return `${Math.round(diff)}min`
    if (diff < 1440) return `${Math.round(diff / 60)}h`
    return `${Math.round(diff / 1440)}d`
  }

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const filtradas = filtro === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtro)
  const getTipo = (id) => TIPOS.find(t => t.id === id) || TIPOS[TIPOS.length - 1]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              Solicitudes
              {pendientes > 0 && <span style={{ marginLeft: '0.5rem', background: '#e74c3c', borderRadius: '50%', width: 20, height: 20, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pendientes}</span>}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · {pendientes} pendiente(s)</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: 'auto', background: 'var(--color-primary)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.78rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            {showForm ? '✕ Cancelar' : '+ Nueva'}
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
          {[
            { id: 'pendiente', label: `⏳ Pendientes (${solicitudes.filter(s => s.estado === 'pendiente').length})` },
            { id: 'en_proceso', label: `🔄 En proceso (${solicitudes.filter(s => s.estado === 'en_proceso').length})` },
            { id: 'completado', label: `✅ Completados` },
            { id: 'todas', label: 'Todas' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{ background: filtro === f.id ? 'white' : 'rgba(255,255,255,0.15)', color: filtro === f.id ? 'var(--color-text)' : 'white', border: 'none', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem' }}>Nueva Solicitud</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Habitación *</div>
              <input value={form.habitacion} onChange={e => setForm({ ...form, habitacion: e.target.value })} placeholder="Ej: SE-502" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Huésped</div>
              <input value={form.huesped} onChange={e => setForm({ ...form, huesped: e.target.value })} placeholder="Nombre" style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Tipo de solicitud *</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {TIPOS.map(t => (
                <button key={t.id} onClick={() => setForm({ ...form, tipo: t.id })} style={{ background: form.tipo === t.id ? 'var(--color-text)' : 'white', color: form.tipo === t.id ? 'white' : 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.4rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción adicional (opcional)..." rows={2} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', fontFamily: 'var(--font-body)', resize: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }} />
          <button onClick={guardar} disabled={saving || !form.habitacion} style={{ width: '100%', background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.88rem', cursor: 'pointer', opacity: saving || !form.habitacion ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : 'Crear solicitud'}
          </button>
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando...</div>}

        {!loading && filtradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🛎️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-light)' }}>Sin solicitudes {filtro !== 'todas' ? filtro + 's' : ''}</div>
          </div>
        )}

        {filtradas.map(s => {
          const tipo = getTipo(s.tipo)
          const estado = ESTADOS_CONFIG[s.estado] || ESTADOS_CONFIG.pendiente
          const minutos = (Date.now() - new Date(s.fecha)) / 60000
          const urgente = s.estado === 'pendiente' && minutos > 15

          return (
            <div key={s.id} onClick={() => setSelected(s)} style={{
              background: 'white',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
              boxShadow: 'var(--shadow)',
              borderLeft: `3px solid ${urgente ? '#e74c3c' : estado.color}`,
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{tipo.emoji}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{tipo.label}</span>
                    {urgente && <span style={{ fontSize: '0.65rem', background: '#FFF0F0', color: '#e74c3c', padding: '0.1rem 0.4rem', borderRadius: 10, fontWeight: 600 }}>⚠️ +15min</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    🛏️ Hab. {s.habitacion} · 👤 {s.huesped}
                    {s.asignadoA && ` · Asignado: ${s.asignadoA}`}
                  </div>
                  {s.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>{s.descripcion}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', background: estado.bg, color: estado.color, padding: '0.2rem 0.5rem', borderRadius: 10, marginBottom: '0.25rem' }}>{estado.emoji} {estado.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{tiempoTranscurrido(s.fecha)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal actualizar */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {getTipo(selected.tipo).emoji} {getTipo(selected.tipo).label}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginBottom: '1.25rem' }}>
              Hab. {selected.habitacion} · {selected.huesped} · {tiempoTranscurrido(selected.fecha)} atrás
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>CAMBIAR ESTADO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              {Object.entries(ESTADOS_CONFIG).map(([key, val]) => (
                <button key={key} onClick={() => actualizarEstado(selected.id, key, null)} style={{ background: selected.estado === key ? val.bg : 'white', border: `2px solid ${selected.estado === key ? val.color : 'var(--color-border)'}`, borderRadius: 10, padding: '0.6rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-text)' }}>
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>ASIGNAR A</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {EMPLEADOS.map(e => (
                <button key={e} onClick={() => actualizarEstado(selected.id, 'en_proceso', e)} style={{ background: selected.asignadoA === e ? 'var(--color-text)' : 'white', color: selected.asignadoA === e ? 'white' : 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '0.3rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>

            <button onClick={() => setSelected(null)} style={{ width: '100%', background: 'none', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
