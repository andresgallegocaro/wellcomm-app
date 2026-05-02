import React, { useState, useEffect } from 'react'

const EMPLEADOS = {
  front: ['Yury', 'Fabian', 'Alex', 'Oscar', 'Rafael'],
  housekeeping: ['Raisa', 'Beatriz', 'Aracelly', 'Carolina', 'Marcela'],
  spa: ['Ana', 'Catalina', 'Rosmery', 'Amalia'],
  terraza: ['Ivan', 'Mateo', 'Carlos', 'Libardo', 'Yeizon', 'Ana Maria', 'Maykol', 'Emily'],
  mantenimiento: ['Andrés', 'Jhonatan'],
  host: ['Jose'],
}

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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [empleado, setEmpleado] = useState('')
  const [deptActivo, setDeptActivo] = useState(null)

  useEffect(() => { cargar() }, [turno])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/checklist?turno=${turno}`)
      const d = await res.json()
      setData(d)
      if (d.tareas?.departamentos) {
        setDeptActivo(Object.keys(d.tareas.departamentos)[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTarea(departamento, tareaIndex, completada) {
    if (!empleado) {
      alert('Selecciona tu nombre primero')
      return
    }
    await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turno, departamento, tareaIndex, completada, empleado })
    })
    await cargar()
  }

  const totalTareas = data?.tareas?.departamentos
    ? Object.values(data.tareas.departamentos).reduce((acc, d) => acc + d.tareas.length, 0)
    : 0

  const completadas = Object.keys(data?.completadas || {}).length
  const progreso = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0

  const turnoInfo = TURNOS.find(t => t.id === turno)
  const departamentos = data?.tareas?.departamentos || {}
  const deptKeys = Object.keys(departamentos)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Checklist de Turno</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · {data?.fecha}</div>
          </div>
        </div>

        {/* Selector de turno */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {TURNOS.map(t => (
            <button key={t.id} onClick={() => setTurno(t.id)} style={{
              background: turno === t.id ? 'white' : 'rgba(255,255,255,0.12)',
              color: turno === t.id ? 'var(--color-text)' : 'white',
              border: 'none', borderRadius: 8,
              padding: '0.5rem 0.25rem', fontSize: '0.72rem',
              cursor: 'pointer', fontFamily: 'var(--font-body)'
            }}>{t.emoji} {t.label}<br /><span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{t.hora}</span></button>
          ))}
        </div>

        {/* Barra de progreso */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.8, marginBottom: '0.3rem' }}>
            <span>Progreso del turno</span>
            <span>{completadas}/{totalTareas} tareas · {progreso}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 6 }}>
            <div style={{ background: progreso === 100 ? '#7EC8A0' : 'white', borderRadius: 4, height: 6, width: `${progreso}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      {/* Selector de empleado */}
      <div style={{ background: 'white', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.4rem' }}>¿Quién eres tú?</div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[...new Set(Object.values(EMPLEADOS).flat())].sort().map(e => (
            <button key={e} onClick={() => setEmpleado(e)} style={{
              background: empleado === e ? 'var(--color-text)' : 'var(--color-bg)',
              color: empleado === e ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 20, padding: '0.25rem 0.65rem',
              fontSize: '0.75rem', cursor: 'pointer'
            }}>{e}</button>
          ))}
        </div>
      </div>

      {/* Tabs departamentos */}
      {deptKeys.length > 0 && (
        <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
          {deptKeys.map(key => {
            const dept = departamentos[key]
            const deptCompletadas = dept.tareas.filter((_, i) => data?.completadas?.[`${key}_${i}`]).length
            return (
              <button key={key} onClick={() => setDeptActivo(key)} style={{
                padding: '0.75rem 1rem', fontSize: '0.72rem', border: 'none',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                color: deptActivo === key ? 'var(--color-text)' : 'var(--color-text-light)',
                borderBottom: deptActivo === key ? '2px solid var(--color-text)' : '2px solid transparent',
                fontWeight: deptActivo === key ? 500 : 400
              }}>
                {dept.label} ({deptCompletadas}/{dept.tareas.length})
              </button>
            )
          })}
        </div>
      )}

      {/* Lista de tareas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>Cargando checklist...</div>}

        {!loading && deptActivo && departamentos[deptActivo]?.tareas.map((tarea, i) => {
          const key = `${deptActivo}_${i}`
          const completadaInfo = data?.completadas?.[key]
          return (
            <div key={i} onClick={() => toggleTarea(deptActivo, i, !completadaInfo)} style={{
              background: 'white',
              borderRadius: 10,
              padding: '0.875rem 1rem',
              boxShadow: completadaInfo ? 'none' : 'var(--shadow)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              opacity: completadaInfo ? 0.6 : 1,
              borderLeft: completadaInfo ? '3px solid var(--color-primary)' : '3px solid var(--color-border)',
              transition: 'all 0.2s'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: completadaInfo ? 'var(--color-primary)' : 'transparent',
                border: `2px solid ${completadaInfo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: 'white', marginTop: '0.1rem'
              }}>
                {completadaInfo ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', textDecoration: completadaInfo ? 'line-through' : 'none' }}>
                  {tarea}
                </div>
                {completadaInfo && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                    ✅ {completadaInfo.empleado} · {new Date(completadaInfo.hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {!loading && progreso === 100 && (
          <div style={{ textAlign: 'center', padding: '1.5rem', background: '#E8F5EE', borderRadius: 'var(--radius)', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '2rem' }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#2d7a4f', marginTop: '0.5rem' }}>
              ¡Turno completado al 100%!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
