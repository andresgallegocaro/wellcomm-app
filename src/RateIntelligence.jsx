import React, { useState, useEffect } from 'react'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function fmt(n) {
  if (!n) return '—'
  return `$${Math.round(n / 1000)}K`
}

function fmtCOP(n) {
  return `COP ${Number(n || 0).toLocaleString('es-CO')}`
}

export default function RateIntelligence({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(0)
  const [vista, setVista] = useState('semana') // 'semana' | 'detalle'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/rates')
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-light)' }}>Analizando precios del mercado...</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>Consultando Cloudbeds y competencia</div>
    </div>
  )

  if (!data) return null

  const diaData = data.tabla[diaSeleccionado]
  const fecha = new Date(diaData.fecha + 'T12:00:00')
  const diaNombre = DIAS[fecha.getDay()]

  const posicionColor = {
    por_encima: '#7EC8A0',
    por_debajo: '#e74c3c',
    igual: '#e67e22'
  }

  const posicionLabel = {
    por_encima: 'Por encima del mercado',
    por_debajo: 'Por debajo del mercado',
    igual: 'En línea con el mercado'
  }

  const posicionEmoji = {
    premium: '🏆',
    economico: '⚠️',
    competitivo: '✅'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Rate Intelligence</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>WELLCOMM · vs {data.tabla[0].hoteles.length - 1} competidores · 7 días</div>
          </div>
          <button onClick={cargar} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>↻ Actualizar</button>
        </div>

        {/* KPIs rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.4rem' }}>
          {[
            { label: 'Ocupación', val: `${data.ocupacionActual}%` },
            { label: 'ADR actual', val: fmt(data.adrActual) },
            { label: 'Posición', val: posicionEmoji[data.resumen.posicionGeneral] + ' ' + (data.resumen.posicionGeneral === 'premium' ? 'Premium' : data.resumen.posicionGeneral === 'economico' ? 'Bajo' : 'OK') },
            { label: 'Alertas', val: data.resumen.alertas > 0 ? `🔴 ${data.resumen.alertas}` : '✅ 0' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{k.val}</div>
              <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Selector de días */}
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>SELECCIONA UN DÍA</div>
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
            {data.tabla.map((dia, i) => {
              const d = new Date(dia.fecha + 'T12:00:00')
              const nombre = DIAS[d.getDay()]
              const num = d.getDate()
              const color = dia.posicion === 'por_encima' ? '#7EC8A0' : dia.posicion === 'por_debajo' ? '#e74c3c' : '#e67e22'
              return (
                <button key={i} onClick={() => setDiaSeleccionado(i)} style={{
                  flexShrink: 0,
                  background: diaSeleccionado === i ? 'var(--color-text)' : 'var(--color-bg)',
                  color: diaSeleccionado === i ? 'white' : 'var(--color-text)',
                  border: `2px solid ${diaSeleccionado === i ? 'var(--color-text)' : color}`,
                  borderRadius: 10, padding: '0.5rem 0.75rem',
                  cursor: 'pointer', textAlign: 'center', minWidth: 52
                }}>
                  <div style={{ fontSize: '0.68rem', opacity: diaSeleccionado === i ? 0.7 : 0.6 }}>{nombre}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{num}</div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: diaSeleccionado === i ? 'white' : color, margin: '0.2rem auto 0' }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Posición de WELLcomm ese día */}
        <div style={{ background: 'var(--color-text)', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '0.68rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            WELLCOMM · {diaNombre} {diaData.fecha.slice(8)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--color-primary)', fontWeight: 300 }}>
                {fmtCOP(diaData.nosotros)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888' }}>Nuestra tarifa publicada</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: posicionColor[diaData.posicion] }}>
                {diaData.diff > 0 ? '+' : ''}{diaData.diff}%
              </div>
              <div style={{ fontSize: '0.68rem', color: '#888' }}>vs media mercado</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>{fmtCOP(diaData.mediasMercado)}</div>
              <div style={{ fontSize: '0.62rem', color: '#888' }}>Media competencia</div>
            </div>
            <div style={{ background: `${posicionColor[diaData.posicion]}22`, borderRadius: 8, padding: '0.6rem', textAlign: 'center', border: `1px solid ${posicionColor[diaData.posicion]}44` }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: posicionColor[diaData.posicion] }}>
                {posicionLabel[diaData.posicion]}
              </div>
              {diaData.alerta && <div style={{ fontSize: '0.62rem', color: '#e74c3c', marginTop: '0.2rem' }}>⚠️ Diferencia alta</div>}
            </div>
          </div>
        </div>

        {/* Tabla de competidores */}
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            Precios de la competencia · {diaNombre} {diaData.fecha.slice(8)}
          </div>
          {diaData.hoteles
            .sort((a, b) => a.precio - b.precio)
            .map((hotel, i) => {
              const esNosotros = hotel.es_nosotros
              const maxPrecio = Math.max(...diaData.hoteles.map(h => h.precio))
              const pct = Math.round((hotel.precio / maxPrecio) * 100)
              return (
                <div key={i} style={{
                  borderBottom: i < diaData.hoteles.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: esNosotros ? '#F0F9F4' : 'transparent',
                  margin: esNosotros ? '0 -1.25rem' : '0',
                  padding: esNosotros ? '0.75rem 1.25rem' : '0.75rem 0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <div style={{ flex: 1, marginRight: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: esNosotros ? 700 : 500, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {esNosotros && <span style={{ background: 'var(--color-primary)', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 10 }}>NOSOTROS</span>}
                        {hotel.nombre}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginTop: '0.15rem' }}>
                        ⭐ {hotel.rating} · {hotel.disponible ? '✅ Disponible' : '❌ Sin disponibilidad'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: esNosotros ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {fmtCOP(hotel.precio)}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>por noche</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${pct}%`, background: esNosotros ? 'var(--color-primary)' : 'var(--color-light)', height: 4, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                </div>
              )
            })}
        </div>

        {/* Vista semanal resumen */}
        <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Posición WELLcomm — próximos 7 días</div>
          {data.tabla.map((dia, i) => {
            const d = new Date(dia.fecha + 'T12:00:00')
            const color = dia.posicion === 'por_encima' ? '#7EC8A0' : dia.posicion === 'por_debajo' ? '#e74c3c' : '#e67e22'
            return (
              <div key={i} onClick={() => setDiaSeleccionado(i)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: i < data.tabla.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{DIAS[d.getDay()]}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 6, position: 'relative' }}>
                    <div style={{ width: `${Math.min(Math.abs(dia.diff) * 2, 100)}%`, background: color, height: 6, borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color, width: 50, textAlign: 'right', flexShrink: 0 }}>
                  {dia.diff > 0 ? '+' : ''}{dia.diff}%
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', width: 60, textAlign: 'right', flexShrink: 0 }}>
                  {fmtCOP(dia.nosotros).replace('COP ', '')}
                </div>
                {dia.alerta && <span style={{ fontSize: '0.7rem' }}>⚠️</span>}
              </div>
            )
          })}
        </div>

        {/* Nota sobre datos */}
        <div style={{ background: '#FFF8E8', borderRadius: 'var(--radius)', padding: '1rem', border: '1px solid #f0c040' }}>
          <div style={{ fontSize: '0.75rem', color: '#856404', lineHeight: 1.6 }}>
            <strong>📊 Sobre los datos:</strong> Los precios de la competencia son estimaciones basadas en rangos históricos de cada hotel. Cuando conectemos la API de Booking.com y Expedia, los datos serán en tiempo real. La ocupación de WELLcomm viene de Cloudbeds en vivo.
          </div>
        </div>

      </div>
    </div>
  )
}
