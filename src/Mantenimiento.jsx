import React, { useState, useEffect } from 'react'

const PRIORIDAD_INFO = {
  alta: { label: 'Alta', color: '#e74c3c', bg: '#FFF0F0', emoji: '🔴' },
  media: { label: 'Media', color: '#e67e22', bg: '#FFF8F0', emoji: '🟡' },
  baja: { label: 'Baja', color: '#3498db', bg: '#F0F8FF', emoji: '🔵' },
}

const ESTADO_INFO = {
  reportado: { label: 'Reportado', color: '#95a5a6', emoji: '📋' },
  en_proceso: { label: 'En proceso', color: '#e67e22', emoji: '🔧' },
  resuelto: { label: 'Resuelto', color: '#7EC8A0', emoji: '✅' },
}

const HABITACIONES_FALLBACK = ['301','302','303','304','305','306','307','401','402','403','404','405','406','407','501','502','503','504','505','506','601','602','603','604','605']
const ZONAS_FALLBACK = ['Spa', 'Terraza', 'Lobby', 'Pasillos y escalas', 'Ascensor', 'Cuarto de empleados', 'Oficina', 'Baños comunes', 'Fachada', 'Cocina', 'Otros']

export default function Mantenimiento({ onBack, usuario, puedePriorizar }) {
  const [tareas, setTareas] = useState([])
  const [catalogo, setCatalogo] = useState({})
  const [habitaciones, setHabitaciones] = useState(HABITACIONES_FALLBACK)
  const [zonasComunes, setZonasComunes] = useState(ZONAS_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes')
  const [updating, setUpdating] = useState(false)
  const [nuevo, setNuevo] = useState(false)
  const [form, setForm] = useState({ tipoUbicacion: 'habitacion', habitacion: '301', zonaOtros: '', categoria: '', descripcion: '' })
  const [verHist, setVerHist] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/mantenimiento')
      const d = await res.json()
      setTareas(d.tareas || [])
      setCatalogo(d.catalogo || {})
      if (d.habitaciones) setHabitaciones(d.habitaciones)
      if (d.zonasComunes) setZonasComunes(d.zonasComunes)
    } finally { setLoading(false) }
  }

  function ubicacionFinal() {
    if (form.tipoUbicacion === 'zona') {
      if (form.habitacion === 'Otros') return (form.zonaOtros || '').trim() || 'Otros'
      return form.habitacion
    }
    return form.habitacion
  }

  async function reportar() {
    if (!form.descripcion && !form.categoria) return
    setUpdating(true)
    try {
      const desc = form.descripcion || form.categoria
      await fetch('/api/mantenimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reportar',
          habitacion: ubicacionFinal(),
          tipoUbicacion: form.tipoUbicacion,
          categoria: form.categoria || 'General',
          descripcion: desc,
          usuario
        })
      })
      setForm({ tipoUbicacion: 'habitacion', habitacion: '301', zonaOtros: '', categoria: '', descripcion: '' })
      setNuevo(false)
      await cargar()
    } finally { setUpdating(false) }
  }

  async function priorizar(id, prioridad) {
    setUpdating(true)
    try {
      await fetch('/api/mantenimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'priorizar', id, prioridad, usuario })
      })
      await cargar()
    } finally { setUpdating(false) }
  }

  async function cambiarEstado(id, estado) {
    setUpdating(true)
    try {
      await fetch('/api/mantenimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'estado', id, estado, usuario })
      })
      await cargar()
    } finally { setUpdating(false) }
  }

  async function eliminar(id) {
    setUpdating(true)
    try {
      await fetch('/api/mantenimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'eliminar', id })
      })
      await cargar()
    } finally { setUpdating(false) }
  }

  const pendientes = tareas.filter(t => t.estado !== 'resuelto')
  const resueltas = tareas.filter(t => t.estado === 'resuelto')
  const sinPriorizar = tareas.filter(t => !t.prioridad && t.estado !== 'resuelto')

  let lista = tareas
  if (filtro === 'pendientes') lista = pendientes
  else if (filtro === 'resueltas') lista = resueltas
  else if (filtro === 'sin_prioridad') lista = sinPriorizar

  const ordenPrioridad = { alta: 0, media: 1, baja: 2, null: 3 }
  lista = [...lista].sort((a, b) => (ordenPrioridad[a.prioridad] ?? 3) - (ordenPrioridad[b.prioridad] ?? 3))

  // Etiqueta de ubicación: "Hab. 301" o el nombre de la zona tal cual
  const etiquetaUbicacion = (t) => t.tipoUbicacion === 'zona' ? t.habitacion : `Hab. ${t.habitacion}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Mantenimiento</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{pendientes.length} pendientes · {sinPriorizar.length} sin priorizar</div>
          </div>
          <button onClick={() => setNuevo(true)} style={{ marginLeft: 'auto', background: 'var(--color-primary)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.75rem', padding: '0.45rem 0.9rem', cursor: 'pointer', fontWeight: 600 }}>+ Reportar</button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {[
            { id: 'pendientes', label: `Pendientes (${pendientes.length})` },
            { id: 'sin_prioridad', label: `Sin priorizar (${sinPriorizar.length})` },
            { id: 'resueltas', label: `Resueltas (${resueltas.length})` },
            { id: 'todas', label: `Todas (${tareas.length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{ background: filtro === f.id ? 'white' : 'rgba(255,255,255,0.15)', color: filtro === f.id ? 'var(--color-text)' : 'white', border: 'none', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de tareas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)' }}>No hay tareas en esta vista.</div>
        ) : (
          lista.map(t => {
            const prio = t.prioridad ? PRIORIDAD_INFO[t.prioridad] : null
            const est = ESTADO_INFO[t.estado] || ESTADO_INFO.reportado
            const esZona = t.tipoUbicacion === 'zona'
            return (
              <div key={t.id} style={{ background: 'var(--color-white)', borderRadius: 12, padding: '1rem', marginBottom: '0.75rem', border: `1px solid var(--color-border)`, borderLeft: `4px solid ${prio ? prio.color : '#ccc'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>{etiquetaUbicacion(t)}</span>
                      {esZona && <span style={{ fontSize: '0.58rem', background: '#EEF6FF', color: '#2980b9', padding: '0.1rem 0.45rem', borderRadius: 10, fontWeight: 600 }}>ÁREA COMÚN</span>}
                      <span style={{ fontSize: '0.62rem', background: '#f0f0f0', color: '#666', padding: '0.1rem 0.5rem', borderRadius: 10 }}>{t.categoria}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.35rem' }}>{t.descripcion}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>
                      Reportó {t.reportadoPor} · {t.reportadoFecha} {t.reportadoHora}
                      {t.estado === 'resuelto' && t.resueltoPor && <> · ✅ Resolvió {t.resueltoPor} ({t.resueltoFecha})</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.62rem', color: est.color, fontWeight: 600 }}>{est.emoji} {est.label}</span>
                    {prio && <span style={{ fontSize: '0.6rem', background: prio.bg, color: prio.color, padding: '0.1rem 0.5rem', borderRadius: 10, fontWeight: 600 }}>{prio.emoji} {prio.label}</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {puedePriorizar && t.estado !== 'resuelto' && (
                    <>
                      <span style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>Prioridad:</span>
                      {Object.entries(PRIORIDAD_INFO).map(([key, info]) => (
                        <button key={key} onClick={() => priorizar(t.id, key)} disabled={updating} style={{
                          background: t.prioridad === key ? info.bg : 'white',
                          border: `1px solid ${t.prioridad === key ? info.color : 'var(--color-border)'}`,
                          color: info.color, borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.66rem', cursor: 'pointer', fontWeight: 600
                        }}>{info.label}</button>
                      ))}
                    </>
                  )}
                </div>

                {/* Estado (resolver) */}
                {t.estado !== 'resuelto' ? (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {t.estado !== 'en_proceso' && (
                      <button onClick={() => cambiarEstado(t.id, 'en_proceso')} disabled={updating} style={{ flex: 1, background: '#FFF8F0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: 8, padding: '0.45rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>🔧 En proceso</button>
                    )}
                    <button onClick={() => cambiarEstado(t.id, 'resuelto')} disabled={updating} style={{ flex: 1, background: '#E8F5EE', border: '1px solid #7EC8A0', color: '#5aaa80', borderRadius: 8, padding: '0.45rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>✅ Marcar resuelto</button>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button onClick={() => cambiarEstado(t.id, 'reportado')} disabled={updating} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-light)', borderRadius: 8, padding: '0.35rem 0.7rem', fontSize: '0.68rem', cursor: 'pointer' }}>↩ Reabrir</button>
                  </div>
                )}

                {/* Historial + eliminar */}
                {puedePriorizar && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--color-border)' }}>
                    <button onClick={() => setVerHist(verHist === t.id ? null : t.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', fontSize: '0.66rem', cursor: 'pointer' }}>
                      {verHist === t.id ? 'Ocultar historial' : '🕓 Historial'}
                    </button>
                    <button onClick={() => eliminar(t.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.66rem', cursor: 'pointer', marginLeft: 'auto' }}>Eliminar</button>
                  </div>
                )}

                {verHist === t.id && (
                  <div style={{ marginTop: '0.6rem', background: 'var(--color-bg)', borderRadius: 8, padding: '0.6rem' }}>
                    {(t.historial || []).map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', padding: '0.2rem 0' }}>
                        <span>{h.accion} · {h.por}</span>
                        <span style={{ color: 'var(--color-text-light)' }}>{h.fecha} {h.hora}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal reportar nuevo daño */}
      {nuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={() => setNuevo(false)}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '1rem' }}>Reportar daño</div>

            {/* Selector tipo de ubicación */}
            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>Ubicación</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button onClick={() => setForm({ ...form, tipoUbicacion: 'habitacion', habitacion: '301', zonaOtros: '' })} style={{
                flex: 1, background: form.tipoUbicacion === 'habitacion' ? 'var(--color-text)' : 'white',
                color: form.tipoUbicacion === 'habitacion' ? 'white' : 'var(--color-text)',
                border: `1px solid ${form.tipoUbicacion === 'habitacion' ? 'var(--color-text)' : 'var(--color-border)'}`,
                borderRadius: 8, padding: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
              }}>🛏️ Habitación</button>
              <button onClick={() => setForm({ ...form, tipoUbicacion: 'zona', habitacion: zonasComunes[0], zonaOtros: '' })} style={{
                flex: 1, background: form.tipoUbicacion === 'zona' ? 'var(--color-text)' : 'white',
                color: form.tipoUbicacion === 'zona' ? 'white' : 'var(--color-text)',
                border: `1px solid ${form.tipoUbicacion === 'zona' ? 'var(--color-text)' : 'var(--color-border)'}`,
                borderRadius: 8, padding: '0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
              }}>🏛️ Área común</button>
            </div>

            {/* Selector concreto según tipo */}
            {form.tipoUbicacion === 'habitacion' ? (
              <select value={form.habitacion} onChange={e => setForm({ ...form, habitacion: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box', background: 'white', fontFamily: 'var(--font-body)' }}>
                {habitaciones.map(h => <option key={h} value={h}>Habitación {h}</option>)}
              </select>
            ) : (
              <>
                <select value={form.habitacion} onChange={e => setForm({ ...form, habitacion: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.85rem', marginBottom: form.habitacion === 'Otros' ? '0.5rem' : '0.75rem', boxSizing: 'border-box', background: 'white', fontFamily: 'var(--font-body)' }}>
                  {zonasComunes.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                {form.habitacion === 'Otros' && (
                  <input value={form.zonaOtros} onChange={e => setForm({ ...form, zonaOtros: e.target.value })} placeholder="Especifica la zona (ej: Parqueadero)"
                    style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.85rem', marginBottom: '0.75rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />
                )}
              </>
            )}

            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>Tipo de incidencia</label>
            <div style={{ marginBottom: '0.75rem' }}>
              {Object.entries(catalogo).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 600, marginBottom: '0.25rem' }}>{cat}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {items.map(item => (
                      <button key={item} onClick={() => setForm({ ...form, categoria: cat, descripcion: item })} style={{
                        background: form.descripcion === item ? 'var(--color-primary)' : 'white',
                        color: form.descripcion === item ? 'white' : 'var(--color-text)',
                        border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.3rem 0.6rem', fontSize: '0.68rem', cursor: 'pointer'
                      }}>{item}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <label style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '0.25rem' }}>Descripción (o escribe una personalizada)</label>
            <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: La cerradura no cierra bien"
              style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }} />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setNuevo(false)} style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>Cancelar</button>
              <button onClick={reportar} disabled={updating || (!form.descripcion && !form.categoria)} style={{ flex: 2, background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                {updating ? 'Reportando...' : 'Reportar daño'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
