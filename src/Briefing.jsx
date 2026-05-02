import React, { useState, useEffect } from 'react'

function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-family:var(--font-display);font-size:1rem;font-weight:500;margin:1rem 0 0.5rem;letter-spacing:0.05em">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:var(--font-display);font-size:1.1rem;font-weight:500;margin:1.25rem 0 0.5rem;letter-spacing:0.05em">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:var(--font-display);font-size:1.3rem;font-weight:400;margin:0 0 0.75rem;letter-spacing:0.08em">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:0.5rem;margin:0.25rem 0"><span style="color:var(--color-primary);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border);margin:1rem 0"/>')
    .replace(/\n\n/g, '<div style="height:0.5rem"></div>')
    .replace(/\n/g, '')
}

export default function Briefing({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('briefing')

  useEffect(() => {
    fetch('/api/briefing')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ width: 48, height: 48, border: '2px solid var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>✳</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text)' }}>Preparando el briefing...</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>Consultando Cloudbeds y generando resumen</div>
      </div>
    </div>
  )

  if (error || data?.error) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Error cargando briefing</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', textAlign: 'center' }}>{error || data?.error}</div>
      <button onClick={onBack} style={{ background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '0.75rem 2rem', cursor: 'pointer' }}>← Volver</button>
    </div>
  )

  const fecha = new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Briefing del Día</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.6, textTransform: 'capitalize' }}>{fecha}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7EC8A0', boxShadow: '0 0 6px #7EC8A0' }} />
            <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>EN VIVO</span>
          </div>
        </div>

        {/* KPIs en header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'En casa', valor: data.enCasa, emoji: '🏡' },
            { label: 'Llegadas', valor: data.llegadas, emoji: '🛬' },
            { label: 'Salidas', valor: data.salidas, emoji: '🛫' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem' }}>{k.emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, lineHeight: 1 }}>{k.valor}</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.2rem' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Ocupación bar */}
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.7, marginBottom: '0.3rem' }}>
            <span>Ocupación</span>
            <span>{data.ocupacion}% · {data.enCasa}/25 hab.</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, height: 4 }}>
            <div style={{ background: '#7EC8A0', borderRadius: 4, height: 4, width: `${data.ocupacion}%`, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        {[
          { id: 'briefing', label: '📋 Briefing IA' },
          { id: 'llegadas', label: `🛬 Llegadas (${data.llegadas})` },
          { id: 'salidas', label: `🛫 Salidas (${data.salidas})` },
          { id: 'encasa', label: `🏡 En casa (${data.enCasa})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1,
            padding: '0.75rem 0.25rem',
            fontSize: '0.68rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-light)',
            borderBottom: activeTab === tab.id ? '2px solid var(--color-text)' : '2px solid transparent',
            fontFamily: 'var(--font-body)',
            fontWeight: activeTab === tab.id ? 500 : 400,
            transition: 'all 0.15s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

        {/* Tab Briefing */}
        {activeTab === 'briefing' && (
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.15em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>✳</span> GENERADO POR IA · DATOS EN TIEMPO REAL
            </div>
            <div
              style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--color-text)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(data.briefing) }}
            />
          </div>
        )}

        {/* Tab Llegadas */}
        {activeTab === 'llegadas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.llegadasDetalle?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                Sin llegadas programadas hoy
              </div>
            )}
            {data.llegadasDetalle?.map((r, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500 }}>{r.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                      Hab. {r.habitacion} · {r.noches} noche(s) · {r.pais}
                    </div>
                    {r.notas && (
                      <div style={{ fontSize: '0.75rem', color: '#e67e22', marginTop: '0.4rem', background: '#FFF8F0', padding: '0.4rem 0.6rem', borderRadius: 6 }}>
                        📌 {r.notas}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', background: 'var(--color-bg)', padding: '0.3rem 0.6rem', borderRadius: 20, color: 'var(--color-text-light)' }}>
                      {r.hora !== '—' ? `⏰ ${r.hora}` : 'Hora TBD'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Salidas */}
        {activeTab === 'salidas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.salidasDetalle?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                Sin salidas programadas hoy
              </div>
            )}
            {data.salidasDetalle?.map((r, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)', borderLeft: '3px solid #e67e22' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500 }}>{r.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>Hab. {r.habitacion}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', background: '#FFF3E0', color: '#e67e22', padding: '0.3rem 0.75rem', borderRadius: 20 }}>
                    Check-out hoy
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab En casa */}
        {activeTab === 'encasa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.enCasaDetalle?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
                Sin huéspedes en casa ahora
              </div>
            )}
            {data.enCasaDetalle?.map((r, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)', borderLeft: '3px solid var(--color-text)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500 }}>{r.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>Hab. {r.habitacion}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>Sale el</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r.salida}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
