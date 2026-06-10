import React, { useState, useEffect } from 'react'

const ESTADOS = [
  { id: 'limpia', label: 'Limpia', color: '#7EC8A0', bg: '#E8F5EE', emoji: '✅' },
  { id: 'ocupada', label: 'Ocupada', color: '#e74c3c', bg: '#FFF0F0', emoji: '🔴' },
  { id: 'sucia', label: 'Sucia', color: '#e67e22', bg: '#FFF8F0', emoji: '🟡' },
  { id: 'checkout', label: 'Check-out', color: '#3498db', bg: '#F0F8FF', emoji: '🔵' },
  { id: 'mantenimiento', label: 'Mantenimiento', color: '#95a5a6', bg: '#F5F5F5', emoji: '⚫' },
  { id: 'bloqueada', label: 'Bloqueada', color: '#8e44ad', bg: '#F8F0FF', emoji: '🔒' },
]

const ESTADOS_ZONA = [
  { id: 'limpia', label: 'Limpia', color: '#7EC8A0', bg: '#E8F5EE', emoji: '✅' },
  { id: 'en_proceso', label: 'En proceso', color: '#e67e22', bg: '#FFF8F0', emoji: '🧹' },
  { id: 'sucia', label: 'Sucia', color: '#e74c3c', bg: '#FFF0F0', emoji: '🟡' },
  { id: 'pendiente', label: 'Pendiente', color: '#3498db', bg: '#F0F8FF', emoji: '🔵' },
  { id: 'mantenimiento', label: 'Mantenimiento', color: '#95a5a6', bg: '#F5F5F5', emoji: '⚫' },
]

const MOVIMIENTOS = {
  sale_hoy: { label: 'Sale hoy', color: '#e74c3c', emoji: '🧳' },
  ocupada: { label: 'Ocupada', color: '#c0392b', emoji: '👤' },
  llega_hoy: { label: 'Llega hoy', color: '#2980b9', emoji: '🛬' },
  libre: { label: 'Libre', color: '#95a5a6', emoji: '·' },
}

export default function Habitaciones({ onBack, usuario, puedeAuditar }) {
  const [habitaciones, setHabitaciones] = useState([])
  const [zonas, setZonas] = useState([])
  const [totales, setTotales] = useState({ auto: 0, manual: 0 })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [selected, setSelected] = useState(null)
  const [selectedZona, setSelectedZona] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [historial, setHistorial] = useState(null)
  const [cargandoHist, setCargandoHist] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/habitaciones')
      const data = await res.json()
      setHabitaciones(data.habitaciones || [])
      setZonas(data.zonas || [])
      setTotales({ auto: data.totalAuto || 0, manual: data.totalManual || 0 })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function actualizarEstado(habitacionId, nuevoEstado) {
    setUpdating(true)
    try {
      await fetch('/api/habitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitacionId, estado: nuevoEstado, usuario: usuario || 'Desconocido' })
      })
      await cargar()
      setSelected(null)
      setHistorial(null)
    } finally {
      setUpdating(false)
    }
  }

  async function actualizarEstadoZona(zonaId, nuevoEstado) {
    setUpdating(true)
    try {
      await fetch('/api/habitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'estado_zona', zonaId, estado: nuevoEstado, usuario: usuario || 'Desconocido' })
      })
      await cargar()
      setSelectedZona(null)
      setHistorial(null)
    } finally {
      setUpdating(false)
    }
  }

  async function verHistorial(habitacionId) {
    setCargandoHist(true); setHistorial(null)
    try {
      const res = await fetch('/api/habitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'historial', habitacionId })
      })
      const d = await res.json()
      if (d.ok) setHistorial(d.historial)
    } finally {
      setCargandoHist(false)
    }
  }

  async function verHistorialZona(zonaId) {
    setCargandoHist(true); setHistorial(null)
    try {
      const res = await fetch('/api/habitaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'historial_zona', zonaId })
      })
      const d = await res.json()
      if (d.ok) setHistorial(d.historial)
    } finally {
      setCargandoHist(false)
    }
  }

  const resumen = ESTADOS.map(e => ({
    ...e,
    count: habitaciones.filter(h => h.estado === e.id).length
  })).filter(e => e.count > 0)

  const filtradas = filtro === 'todas' ? habitaciones : habitaciones.filter(h => h.estado === filtro)
  const getEstado = (id) => ESTADOS.find(e => e.id === id) || ESTADOS[0]
  const getEstadoLabel = (id) => (ESTADOS.find(e => e.id === id) || {}).label || id
  const getEstadoZona = (id) => ESTADOS_ZONA.find(e => e.id === id) || ESTADOS_ZONA[0]
  const getEstadoZonaLabel = (id) => (ESTADOS_ZONA.find(e => e.id === id) || {}).label || id

  const salenHoy = habitaciones.filter(h => h.movimiento === 'sale_hoy').length
  const lleganHoy = habitaciones.filter(h => h.movimiento === 'llega_hoy').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Estado de Habitaciones</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · 🧳 {salenHoy} salen · 🛬 {lleganHoy} llegan · 🔄 {totales.auto} auto · ✋ {totales.manual} manual</div>
          </div>
          <button onClick={cargar} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>↻ Cloudbeds</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button onClick={() => setFiltro('todas')} style={{ background: filtro === 'todas' ? 'white' : 'rgba(255,255,255,0.15)', color: filtro === 'todas' ? 'var(--color-text)' : 'white', border: 'none', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Todas ({habitaciones.length})
          </button>
          {resumen.map(e => (
            <button key={e.id} onClick={() => setFiltro(e.id)} style={{ background: filtro === e.id ? 'white' : 'rgba(255,255,255,0.15)', color: filtro === e.id ? 'var(--color-text)' : 'white', border: 'none', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {e.emoji} {e.label} ({e.count})
            </button>
          ))}
        </div>
      </div>

      {/* Grid habitaciones + áreas comunes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Leyendo Cloudbeds...</div>
        ) : (
          <>
            {['3', '4', '5', '6'].map(piso => {
              const habsPiso = filtradas.filter(h => h.piso === parseInt(piso))
              if (habsPiso.length === 0) return null
              return (
                <div key={piso} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    PISO {piso}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '0.5rem' }}>
                    {habsPiso.map(hab => {
                      const estado = getEstado(hab.estado)
                      const mov = MOVIMIENTOS[hab.movimiento] || MOVIMIENTOS.libre
                      const mostrarHuesped = (hab.movimiento === 'ocupada' || hab.movimiento === 'sale_hoy') && hab.huesped
                      return (
                        <button key={hab.id} onClick={() => { setSelected(hab); setHistorial(null) }} style={{
                          background: estado.bg,
                          border: `2px solid ${estado.color}`,
                          borderRadius: 10,
                          padding: '0.6rem 0.5rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'transform 0.1s',
                          position: 'relative'
                        }}>
                          {/* Marca Auto/Manual arriba-izquierda */}
                          <div style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.5rem', fontWeight: 700, padding: '0.05rem 0.3rem', borderRadius: 6, background: hab.esManual ? '#5aaa80' : 'rgba(0,0,0,0.12)', color: hab.esManual ? 'white' : 'var(--color-text-light)', letterSpacing: '0.03em' }}>
                            {hab.esManual ? '✋' : '🔄'}
                          </div>
                          {hab.movimiento !== 'libre' && (
                            <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.6rem' }} title={mov.label}>{mov.emoji}</div>
                          )}
                          <div style={{ fontSize: '1.1rem' }}>{estado.emoji}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.2rem' }}>{hab.id}</div>
                          <div style={{ fontSize: '0.6rem', color: estado.color, marginTop: '0.1rem' }}>{estado.label}</div>
                          <div style={{ fontSize: '0.55rem', color: mov.color, marginTop: '0.15rem', fontWeight: 500 }}>{mov.label}</div>
                          {mostrarHuesped && (
                            <div style={{ fontSize: '0.55rem', color: 'var(--color-text)', marginTop: '0.15rem', fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hab.huesped}>
                              👤 {hab.huesped}
                            </div>
                          )}
                          {puedeAuditar && hab.autor && (
                            <div style={{ fontSize: '0.52rem', color: 'var(--color-text-light)', marginTop: '0.15rem' }}>
                              {hab.autor} · {hab.hora}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* ── Sección Áreas comunes ── */}
            {zonas.length > 0 && (
              <div style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ flex: 1 }}>🏛️ ÁREAS COMUNES · ASEO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '0.5rem' }}>
                  {zonas.map(z => {
                    const estado = getEstadoZona(z.estado)
                    return (
                      <button key={z.id} onClick={() => { setSelectedZona(z); setHistorial(null) }} style={{
                        background: estado.bg,
                        border: `2px solid ${estado.color}`,
                        borderRadius: 10,
                        padding: '0.6rem 0.5rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                        <div style={{ fontSize: '1.1rem' }}>{estado.emoji}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.2rem', lineHeight: 1.2 }}>{z.nombre}</div>
                        <div style={{ fontSize: '0.58rem', color: estado.color, marginTop: '0.15rem' }}>{estado.label}</div>
                        {puedeAuditar && z.autor && (
                          <div style={{ fontSize: '0.52rem', color: 'var(--color-text-light)', marginTop: '0.15rem' }}>
                            {z.autor} · {z.hora}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal actualizar estado HABITACIÓN */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => { setSelected(null); setHistorial(null) }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>Habitación {selected.id}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>{selected.tipo} · Estado actual: {getEstadoLabel(selected.estado)}</div>

            {/* Nombre del huésped si está ocupada o sale hoy */}
            {(selected.movimiento === 'ocupada' || selected.movimiento === 'sale_hoy') && selected.huesped && (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.5rem', fontWeight: 600 }}>
                👤 Huésped: {selected.huesped}
              </div>
            )}

            {/* Indicador auto/manual */}
            <div style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 8, marginBottom: '0.5rem', background: selected.esManual ? '#E8F5EE' : '#F5F5F5', color: selected.esManual ? '#5aaa80' : 'var(--color-text-light)' }}>
              {selected.esManual ? '✋ Estado puesto a mano hoy' : '🔄 Estado automático (Cloudbeds)'}
            </div>

            {selected.movimiento !== 'libre' && (
              <div style={{ fontSize: '0.75rem', color: (MOVIMIENTOS[selected.movimiento] || {}).color, marginBottom: '0.5rem', fontWeight: 500 }}>
                {(MOVIMIENTOS[selected.movimiento] || {}).emoji} Según Cloudbeds: {(MOVIMIENTOS[selected.movimiento] || {}).label}
              </div>
            )}

            {puedeAuditar && selected.autor && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem', background: 'var(--color-bg)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                Última actualización: <strong>{selected.autor}</strong> a las {selected.hora}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {ESTADOS.map(e => (
                <button key={e.id} onClick={() => actualizarEstado(selected.id, e.id)} disabled={updating} style={{
                  background: selected.estado === e.id ? e.bg : 'white',
                  border: `2px solid ${selected.estado === e.id ? e.color : 'var(--color-border)'}`,
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
                  <span>{e.emoji}</span>
                  <span>{e.label}</span>
                </button>
              ))}
            </div>

            {puedeAuditar && (
              <>
                {!historial && (
                  <button onClick={() => verHistorial(selected.id)} disabled={cargandoHist} style={{ marginTop: '1rem', width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.7rem', cursor: 'pointer', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 500 }}>
                    {cargandoHist ? 'Cargando...' : '🕓 Ver historial de esta habitación'}
                  </button>
                )}
                {historial && (
                  <div style={{ marginTop: '1rem', background: 'var(--color-bg)', borderRadius: 10, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.6rem' }}>Historial de cambios</div>
                    {historial.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Sin cambios registrados aún.</div>}
                    {historial.map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < historial.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{getEstadoLabel(h.estado)}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}> · {h.autor}</span>
                        </div>
                        <span style={{ fontSize: '0.66rem', color: 'var(--color-text-light)' }}>{h.fecha} {h.hora}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button onClick={() => { setSelected(null); setHistorial(null) }} style={{ marginTop: '1rem', width: '100%', background: 'none', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal actualizar estado ZONA COMÚN */}
      {selectedZona && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => { setSelectedZona(null); setHistorial(null) }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{selectedZona.nombre}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Área común · Estado actual: {getEstadoZonaLabel(selectedZona.estado)}</div>

            {puedeAuditar && selectedZona.autor && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem', background: 'var(--color-bg)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                Última actualización: <strong>{selectedZona.autor}</strong> a las {selectedZona.hora}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {ESTADOS_ZONA.map(e => (
                <button key={e.id} onClick={() => actualizarEstadoZona(selectedZona.id, e.id)} disabled={updating} style={{
                  background: selectedZona.estado === e.id ? e.bg : 'white',
                  border: `2px solid ${selectedZona.estado === e.id ? e.color : 'var(--color-border)'}`,
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
                  <span>{e.emoji}</span>
                  <span>{e.label}</span>
                </button>
              ))}
            </div>

            {puedeAuditar && (
              <>
                {!historial && (
                  <button onClick={() => verHistorialZona(selectedZona.id)} disabled={cargandoHist} style={{ marginTop: '1rem', width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.7rem', cursor: 'pointer', color: 'var(--color-text)', fontSize: '0.8rem', fontWeight: 500 }}>
                    {cargandoHist ? 'Cargando...' : '🕓 Ver historial de esta zona'}
                  </button>
                )}
                {historial && (
                  <div style={{ marginTop: '1rem', background: 'var(--color-bg)', borderRadius: 10, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.6rem' }}>Historial de aseo</div>
                    {historial.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Sin cambios registrados aún.</div>}
                    {historial.map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < historial.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{getEstadoZonaLabel(h.estado)}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}> · {h.autor}</span>
                        </div>
                        <span style={{ fontSize: '0.66rem', color: 'var(--color-text-light)' }}>{h.fecha} {h.hora}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button onClick={() => { setSelectedZona(null); setHistorial(null) }} style={{ marginTop: '1rem', width: '100%', background: 'none', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
