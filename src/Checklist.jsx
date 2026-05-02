import React, { useState, useEffect } from 'react'

const TURNOS = [
  { id: 'manana', label: 'Mañana', hora: '6am–2:30pm', emoji: '🌅' },
  { id: 'tarde', label: 'Tarde', hora: '1:30pm–10pm', emoji: '☀️' },
  { id: 'noche', label: 'Noche', hora: '10pm–6am', emoji: '🌙' },
]

function getTurnoActual() {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 14) return 'manana'
  if (hora >= 14 && hora < 22) return 'tarde'
  return 'noche'
}

export default function Checklist({ onBack }) {
  const [turno, setTurno] = useState(getTurnoActual())
  const [puesto, setPuesto] = useState(null)
  const [empleado, setEmpleado] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
    setPuesto(null)
    setEmpleado(null)
  }, [turno])

  useEffect(() => {
    if (data && !puesto) {
      const puestos = Object.keys(data.tareas?.puestos || {})
      if (puestos.length > 0) setPuesto(puestos[0])
    }
  }, [data])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/checklist?turno=${turno}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTarea(tareaIndex, completada) {
    if (!empleado) return
    await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turno, puesto, tareaIndex, completada, empleado })
    })
    await cargar()
  }

  const puestos = data?.tareas?.puestos || {}
  const puestoActual = puestos[puesto]
  const tareas = puestoActual?.tareas || []
  const completadasPuesto = tareas.filter((_, i) => data?.completadas?.[`${puesto}_${i}`]).length
  const progreso = tareas.length > 0 ? Math.round((completadasPuesto / tareas.length) * 100) : 0

  const totalGlobal = Object.values(puestos).reduce((acc, p) => acc + p.tareas.length, 0)
  const completadasGlobal = Object.keys(data?.completadas || {}).length
  const progresoGlobal = totalGlobal > 0 ? Math.round((completadasGlobal / totalGlobal) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Checklist de Turno</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · {data?.fecha} · {progresoGlobal}% completado</div>
          </div>
        </div>

        {/* Selector turno */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {TURNOS.map(t => (
            <button key={t.id} onClick={() => setTurno(t.id)} style={{
              background: turno === t.id ? 'white' : 'rgba(255,255,255,0.12)',
              color: turno === t.id ? 'var(--color-text)' : 'white',
              border: 'none', borderRadius: 8, padding: '0.5rem 0.25rem',
              fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontWeight: turno === t.id ? 600 : 400, textAlign: 'center'
            }}>{t.emoji} {t.label}<br /><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{t.hora}</span></button>
          ))}
        </div>

        {/* Barra progreso global */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', opacity: 0.7, marginBottom: '0.25rem' }}>
            <span>Progreso total del turno</span>
            <span>{completadasGlobal}/{totalGlobal} tareas</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 5 }}>
            <div style={{ background: progresoGlobal === 100 ? '#7EC8A0' : 'white', borderRadius: 4, height: 5, width: `${progresoGlobal}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* Selector de puesto */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {Object.entries(puestos).map(([key, p]) => {
            const comp = p.tareas.filter((_, i) => data?.completadas?.[`${key}_${i}`]).length
            const prog = Math.round((comp / p.tareas.length) * 100)
            return (
              <button key={key} onClick={() => { setPuesto(key); setEmpleado(null) }} style={{
                padding: '0.75rem 1rem', fontSize: '0.72rem', border: 'none',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: puesto === key ? 'var(--color-text)' : 'var(--color-text-light)',
                borderBottom: puesto === key ? '2px solid var(--color-text)' : '2px solid transparent',
                fontWeight: puesto === key ? 500 : 400, textAlign: 'center'
              }}>
                {p.emoji} {p.label}<br />
                <span style={{ fontSize: '0.62rem', color: prog === 100 ? 'var(--color-primary)' : 'var(--color-text-light)' }}>
                  {comp}/{p.tareas.length} {prog === 100 ? '✅' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selector de empleado */}
      {puestoActual && (
        <div style={{ background: '#FAFAFA', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', marginBottom: '0.4rem' }}>
            ¿Quién eres? Selecciona tu nombre para marcar tareas
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {puestoActual.empleados.map(e => (
              <button key={e} onClick={() => setEmpleado(e)} style={{
                background: empleado === e ? 'var(--color-text)' : 'white',
                color: empleado === e ? 'white' : 'var(--color-text)',
                border: `1px solid ${empleado === e ? 'var(--color-text)' : 'var(--color-border)'}`,
                borderRadius: 20, padding: '0.3rem 0.75rem',
                fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)'
              }}>{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* Lista tareas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando checklist...</div>
        )}

        {!loading && !empleado && puestoActual && (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👆</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-light)' }}>
              Selecciona tu nombre para comenzar
            </div>
          </div>
        )}

        {!loading && empleado && tareas.map((tarea, i) => {
          const key = `${puesto}_${i}`
          const completadaInfo = data?.completadas?.[key]
          return (
            <div key={i} onClick={() => toggleTarea(i, !completadaInfo)} style={{
              background: 'white',
              borderRadius: 10,
              padding: '0.875rem 1rem',
              boxShadow: completadaInfo ? 'none' : 'var(--shadow)',
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              cursor: 'pointer', opacity: completadaInfo ? 0.65 : 1,
              borderLeft: `3px solid ${completadaInfo ? 'var(--color-primary)' : 'var(--color-border)'}`,
              transition: 'all 0.15s'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '0.1rem',
                background: completadaInfo ? 'var(--color-primary)' : 'transparent',
                border: `2px solid ${completadaInfo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: 'white'
              }}>
                {completadaInfo ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', textDecoration: completadaInfo ? 'line-through' : 'none', lineHeight: 1.5 }}>
                  {tarea}
                </div>
                {completadaInfo && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                    ✅ {completadaInfo.empleado} · {new Date(completadaInfo.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {!loading && empleado && progreso === 100 && (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: '#E8F5EE', borderRadius: 'var(--radius)', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#2d7a4f', marginTop: '0.5rem' }}>
              ¡{puestoActual?.label} al 100%!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
