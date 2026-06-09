import React, { useState, useEffect } from 'react'

const ESTADO_INFO = {
  'In-house':    { label: 'In-house', color: '#27ae60', bg: '#E8F5EE', emoji: '🏨' },
  'Desde casa':  { label: 'Desde casa', color: '#3498db', bg: '#F0F8FF', emoji: '🏠' },
  'Vacaciones':  { label: 'Vacaciones', color: '#e67e22', bg: '#FFF8F0', emoji: '🌴' },
  'Descanso':    { label: 'Descanso', color: '#95a5a6', bg: '#F5F5F5', emoji: '😴' },
  'Incapacidad': { label: 'Incapacidad', color: '#e74c3c', bg: '#FFF0F0', emoji: '🩺' },
  'Calamidad':   { label: 'Calamidad', color: '#c0392b', bg: '#FFF0F0', emoji: '⚠️' },
}

const AREA_COLOR = {
  'Front': '#3498db', 'Spa': '#e91e63', 'Housekeeping': '#27ae60',
  'Mantenimiento': '#e67e22', 'The Terrace': '#9b59b6', 'Mercadeo': '#f39c12',
  'Dirección': '#e74c3c', 'Sin área': '#95a5a6',
}

function hoyColombia() {
  const now = new Date(Date.now() - 5 * 3600000)
  return now.toISOString().slice(0, 10)
}

export default function Equipo({ onBack, usuario, puedeEditar }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(hoyColombia())
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [filtroArea, setFiltroArea] = useState('todas')

  useEffect(() => { cargar() }, [fecha])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/personal?fecha=${fecha}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function cambiarEstado(empleadoId, estado) {
    setUpdating(true)
    try {
      await fetch('/api/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'estado', empleadoId, fecha, estado, usuario: usuario || 'Desconocido' })
      })
      await cargar()
      setSelected(null)
    } finally {
      setUpdating(false)
    }
  }

  const empleados = data?.empleados || []
  const areas = ['todas', ...Array.from(new Set(empleados.map(e => e.area)))]
  const filtrados = filtroArea === 'todas' ? empleados : empleados.filter(e => e.area === filtroArea)

  // Agrupar por área
  const porArea = {}
  filtrados.forEach(e => {
    if (!porArea[e.area]) porArea[e.area] = []
    porArea[e.area].push(e)
  })

  const getEstado = (id) => ESTADO_INFO[id] || ESTADO_INFO['In-house']
  const esHoy = fecha === hoyColombia()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Equipo</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{data?.total || 0} personas · {esHoy ? 'Hoy' : fecha}</div>
          </div>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.6rem', fontFamily: 'var(--font-body)' }} />
        </div>

        {/* Resumen por estado */}
        {data?.resumen && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {Object.entries(data.resumen).filter(([, n]) => n > 0).map(([est, n]) => {
              const info = getEstado(est)
              return (
                <div key={est} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '0.3rem 0.7rem', fontSize: '0.7rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>{info.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{n}</span>
                  <span style={{ opacity: 0.7 }}>{info.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filtro de áreas */}
      <div style={{ padding: '0.75rem 1.25rem 0', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
        {areas.map(a => (
          <button key={a} onClick={() => setFiltroArea(a)} style={{
            background: filtroArea === a ? 'var(--color-text)' : 'white',
            color: filtroArea === a ? 'white' : 'var(--color-text)',
            border: `1px solid ${filtroArea === a ? 'var(--color-text)' : 'var(--color-border)'}`,
            borderRadius: 20, padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, textTransform: a === 'todas' ? 'capitalize' : 'none'
          }}>{a === 'todas' ? 'Todas las áreas' : a}</button>
        ))}
      </div>

      {/* Lista por área */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando equipo...</div>
        ) : empleados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
            No hay personal cargado. Verifica que la base "Personal WELLcomm" esté conectada a la integración WELLcomm App en Notion.
          </div>
        ) : (
          Object.entries(porArea).map(([area, gente]) => (
            <div key={area} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: AREA_COLOR[area] || '#95a5a6' }} />
                {area.toUpperCase()} ({gente.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {gente.map(emp => {
                  const estado = getEstado(emp.estado)
                  return (
                    <button key={emp.id} onClick={() => puedeEditar ? setSelected(emp) : null} style={{
                      background: estado.bg,
                      border: `2px solid ${estado.color}`,
                      borderRadius: 10,
                      padding: '0.7rem',
                      cursor: puedeEditar ? 'pointer' : 'default',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{emp.nombre}</span>
                        <span style={{ fontSize: '1rem' }}>{estado.emoji}</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: estado.color, fontWeight: 600 }}>{estado.label}</span>
                      {emp.notas && <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)' }}>{emp.notas}</span>}
                      {puedeEditar && emp.autor && (
                        <span style={{ fontSize: '0.55rem', color: 'var(--color-text-light)' }}>{emp.autor} · {emp.hora}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal cambiar estado (solo si puede editar) */}
      {selected && puedeEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{selected.nombre}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
              {selected.area} · {esHoy ? 'Hoy' : fecha} · Estado actual: {getEstado(selected.estado).label}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.entries(ESTADO_INFO).map(([id, info]) => (
                <button key={id} onClick={() => cambiarEstado(selected.id, id)} disabled={updating} style={{
                  background: selected.estado === id ? info.bg : 'white',
                  border: `2px solid ${selected.estado === id ? info.color : 'var(--color-border)'}`,
                  borderRadius: 10,
                  padding: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: 'var(--color-text)',
                  opacity: updating ? 0.5 : 1
                }}>
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setSelected(null)} style={{ marginTop: '1rem', width: '100%', background: 'none', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
