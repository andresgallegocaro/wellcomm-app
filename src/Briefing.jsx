import React, { useState, useEffect } from 'react'

export default function Briefing({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/briefing')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-light)' }}>Generando briefing del día...</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Claude está revisando los datos de Cloudbeds</div>
    </div>
  )

  if (error || data?.error) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Error cargando briefing</div>
      <button onClick={onBack} style={{ background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.75rem 2rem', cursor: 'pointer' }}>← Volver</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Briefing del Día</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, letterSpacing: '0.1em' }}>WELLCOMM · {data.fecha}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7EC8A0', boxShadow: '0 0 6px #7EC8A0' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>EN VIVO</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* KPIs rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <MiniKPI emoji="🏨" label="En casa" valor={data.enCasa} color="#7EC8A0" />
          <MiniKPI emoji="🛬" label="Llegadas" valor={data.llegadas} color="#1A1A1A" />
          <MiniKPI emoji="🛫" label="Salidas" valor={data.salidas} color="#1A1A1A" />
        </div>

        {/* Briefing IA */}
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', borderLeft: '3px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            ✳ BRIEFING GENERADO POR IA
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
            {data.briefing}
          </div>
        </div>

        {/* Llegadas del día */}
        {data.llegadasDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🛬 Llegadas de hoy
            </div>
            {data.llegadasDetalle.map((r, i) => (
              <div key={i} style={{ padding: '0.75rem 0', borderBottom: i < data.llegadasDetalle.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.nombre}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginTop: '0.2rem' }}>
                      Hab. {r.habitacion} · {r.noches} noche(s) · {r.pais}
                    </div>
                    {r.notas && (
                      <div style={{ fontSize: '0.72rem', color: '#e67e22', marginTop: '0.2rem' }}>
                        📌 {r.notas}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', background: 'var(--color-bg)', padding: '0.25rem 0.5rem', borderRadius: '10px' }}>
                    {r.hora !== '—' ? `⏰ ${r.hora}` : 'Hora TBD'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Salidas del día */}
        {data.salidasDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🛫 Salidas de hoy
            </div>
            {data.salidasDetalle.map((r, i) => (
              <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < data.salidasDetalle.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.nombre}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Hab. {r.habitacion}</div>
                </div>
                <div style={{ fontSize: '0.72rem', background: '#FFF3E0', color: '#e67e22', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                  Check-out hoy
                </div>
              </div>
            ))}
          </div>
        )}

        {/* En casa */}
        {data.enCasaDetalle?.length > 0 && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              🏡 En casa ahora
            </div>
            {data.enCasaDetalle.map((r, i) => (
              <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < data.enCasaDetalle.length - 1 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.nombre}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Hab. {r.habitacion}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                  Sale: {r.salida}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function MiniKPI({ emoji, label, valor, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '0.75rem', boxShadow: 'var(--shadow)', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '1.25rem' }}>{emoji}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 500 }}>{valor}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{label}</div>
    </div>
  )
}
