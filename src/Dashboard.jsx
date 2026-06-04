import React, { useState, useEffect } from 'react'

export default function Dashboard({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen error={error} onBack={onBack} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Dashboard Operativo</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, letterSpacing: '0.1em' }}>WELLCOMM · {data.fecha}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7EC8A0', boxShadow: '0 0 6px #7EC8A0' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>CLOUDBEDS LIVE</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* KPIs principales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <KPICard titulo="Ocupación" valor={`${data.ocupacion}%`} sub={`${data.enCasa} de ${data.totalHabitaciones} hab.`} color="#7EC8A0" />
          <KPICard titulo="ADR" valor={`$${data.adr?.toLocaleString('es-CO')}`} sub="Tarifa promedio hoy" color="#1A1A1A" />
          <KPICard titulo="RevPAR" valor={`$${data.revpar?.toLocaleString('es-CO')}`} sub="Revenue por hab. disponible" color="#1A1A1A" />
          <KPICard titulo="En casa" valor={data.enCasa} sub="Huéspedes actuales" color="#7EC8A0" />
        </div>

        {/* Movimientos del día */}
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Movimientos de hoy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <MovCard emoji="🛬" label="Llegadas" valor={data.llegadas} color="#7EC8A0" />
            <MovCard emoji="🛫" label="Salidas" valor={data.salidas} color="#1A1A1A" />
          </div>
        </div>

        {/* Lista llegadas */}
        {data.llegadasDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🛬 Llegadas pendientes
            </div>
            {data.llegadasDetalle.map((r, i) => (
              <div key={i} style={{
                padding: '0.6rem 0',
                borderBottom: i < data.llegadasDetalle.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.nombre || 'Huésped'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                    Hab. {r.habitacion || '—'} · {r.noches || '—'} noche(s) · {r.canal || '—'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--color-bg)', borderRadius: '20px', padding: '0.25rem 0.75rem',
                  fontSize: '0.72rem', color: 'var(--color-text-light)'
                }}>
                  ${parseFloat(r.total || 0).toLocaleString('es-CO')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista salidas */}
        {data.salidasDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🛫 Salidas de hoy
            </div>
            {data.salidasDetalle.map((r, i) => (
              <div key={i} style={{
                padding: '0.6rem 0',
                borderBottom: i < data.salidasDetalle.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.nombre || 'Huésped'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{r.canal || '—'}</div>
                </div>
                <div style={{
                  background: '#FFF3E0', borderRadius: '20px', padding: '0.25rem 0.75rem',
                  fontSize: '0.72rem', color: '#b8742a'
                }}>
                  Check-out
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista en casa */}
        {data.enCasaDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🏨 En casa ahora
            </div>
            {data.enCasaDetalle.map((r, i) => (
              <div key={i} style={{
                padding: '0.6rem 0',
                borderBottom: i < data.enCasaDetalle.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.nombre || 'Huésped'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                    Hab. {r.habitacion || '—'} · Sale: {r.salida || '—'} · {r.canal || '—'}
                  </div>
                </div>
                <div style={{
                  background: '#E8F5EE', borderRadius: '20px', padding: '0.25rem 0.75rem',
                  fontSize: '0.72rem', color: '#2d7a4f', textAlign: 'right', flexShrink: 0
                }}>
                  ${parseFloat(r.adrNoche || 0).toLocaleString('es-CO')}/noche
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function KPICard({ titulo, valor, sub, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)', padding: '1rem',
      boxShadow: 'var(--shadow)', borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>{titulo}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 500 }}>{valor}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '0.2rem' }}>{sub}</div>
    </div>
  )
}

function MovCard({ emoji, label, valor, color }) {
  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem'
    }}>
      <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 500, color }}>{valor}</div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-light)' }}>Cargando datos de Cloudbeds...</div>
    </div>
  )
}

function ErrorScreen({ error, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Error conectando con Cloudbeds</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', textAlign: 'center' }}>{error}</div>
      <button onClick={onBack} style={{ marginTop: '1rem', background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.75rem 2rem', cursor: 'pointer' }}>← Volver</button>
    </div>
  )
}
