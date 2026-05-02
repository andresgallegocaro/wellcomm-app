import React, { useState, useEffect } from 'react'

const DEPARTAMENTOS = ['General', 'Recepción', 'Housekeeping', 'Spa', 'Terraza', 'Mantenimiento']
const TURNOS = ['Mañana', 'Tarde', 'Noche']
const EMPLEADOS = ['Andrés', 'David', 'Catalina', 'María', 'José', 'Equipo']

export default function Novedades({ onBack }) {
  const [novedades, setNovedades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [form, setForm] = useState({
    texto: '',
    empleado: 'Equipo',
    departamento: 'General',
    turno: 'Mañana',
    prioridad: 'normal'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/novedades')
      const data = await res.json()
      setNovedades(data.novedades || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function guardar() {
    if (!form.texto.trim()) return
    setSaving(true)
    try {
      await fetch('/api/novedades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setForm({ texto: '', empleado: 'Equipo', departamento: 'General', turno: 'Mañana', prioridad: 'normal' })
      setShowForm(false)
      await cargar()
    } finally {
      setSaving(false)
    }
  }

  async function marcarLeida(id) {
    await fetch('/api/novedades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    await cargar()
  }

  const noLeidas = novedades.filter(n => !n.leida).length
  const filtradas = filtro === 'todas' ? novedades : filtro === 'pendientes' ? novedades.filter(n => !n.leida) : novedades.filter(n => n.departamento === filtro)

  function formatFecha(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const prioridadColor = { urgente: '#e74c3c', alta: '#e67e22', normal: 'var(--color-text-light)' }
  const prioridadBg = { urgente: '#FFF0F0', alta: '#FFF8F0', normal: 'var(--color-bg)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              Libro de Novedades
              {noLeidas > 0 && <span style={{ marginLeft: '0.5rem', background: '#e74c3c', borderRadius: '50%', width: 20, height: 20, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{noLeidas}</span>}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · {noLeidas} pendiente(s)</div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ marginLeft: 'auto', background: 'var(--color-primary)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.78rem', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500 }}>
            {showForm ? '✕ Cancelar' : '+ Nueva novedad'}
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {['todas', 'pendientes', ...DEPARTAMENTOS].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              background: filtro === f ? 'white' : 'rgba(255,255,255,0.15)',
              color: filtro === f ? 'var(--color-text)' : 'white',
              border: 'none', borderRadius: '20px',
              padding: '0.3rem 0.75rem', fontSize: '0.7rem',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>Nueva Novedad</div>

          <textarea
            value={form.texto}
            onChange={e => setForm({ ...form, texto: e.target.value })}
            placeholder="Describe la novedad del turno..."
            rows={3}
            style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem', fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--font-body)', resize: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Empleado</div>
              <select value={form.empleado} onChange={e => setForm({ ...form, empleado: e.target.value })} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', background: 'white' }}>
                {EMPLEADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Departamento</div>
              <select value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', background: 'white' }}>
                {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Turno</div>
              <select value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', background: 'white' }}>
                {TURNOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Prioridad</div>
              <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })} style={{ width: '100%', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem', fontSize: '0.85rem', background: 'white' }}>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
            </div>
          </div>

          <button onClick={guardar} disabled={saving || !form.texto.trim()} style={{ marginTop: '0.75rem', width: '100%', background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.88rem', cursor: 'pointer', opacity: saving || !form.texto.trim() ? 0.5 : 1, fontFamily: 'var(--font-body)' }}>
            {saving ? 'Guardando...' : 'Guardar novedad'}
          </button>
        </div>
      )}

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando novedades...</div>
        )}

        {!loading && filtradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-light)' }}>Sin novedades registradas</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>Toca "+ Nueva novedad" para añadir la primera</div>
          </div>
        )}

        {filtradas.map(n => (
          <div key={n.id} style={{
            background: n.leida ? 'white' : prioridadBg[n.prioridad],
            borderRadius: 'var(--radius)',
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow)',
            borderLeft: `3px solid ${n.leida ? 'var(--color-border)' : prioridadColor[n.prioridad]}`,
            opacity: n.leida ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--color-text)' }}>{n.texto}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: 10, color: 'var(--color-text-light)' }}>👤 {n.empleado}</span>
                  <span style={{ fontSize: '0.68rem', background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: 10, color: 'var(--color-text-light)' }}>🏢 {n.departamento}</span>
                  <span style={{ fontSize: '0.68rem', background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: 10, color: 'var(--color-text-light)' }}>⏰ {n.turno}</span>
                  {n.prioridad !== 'normal' && <span style={{ fontSize: '0.68rem', background: prioridadBg[n.prioridad], padding: '0.2rem 0.5rem', borderRadius: 10, color: prioridadColor[n.prioridad], fontWeight: 500 }}>{n.prioridad === 'urgente' ? '🔴 Urgente' : '🟡 Alta'}</span>}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', marginTop: '0.4rem' }}>{formatFecha(n.fecha)}</div>
              </div>
              {!n.leida && (
                <button onClick={() => marcarLeida(n.id)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--color-text-light)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  ✓ Leída
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
