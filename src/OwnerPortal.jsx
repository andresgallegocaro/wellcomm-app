import { useState, useEffect } from 'react'

const C = {
  bg: '#E8F0EC',
  dark: '#1A1A1A',
  primary: '#7EC8A0',
  primaryDark: '#5aaa80',
  text: '#1A1A1A',
  muted: '#7a8c82',
  light: '#d0ddd5',
  white: '#FFFFFF',
  gold: '#7EC8A0',
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

function fmtCOP(n) {
  return `COP ${Number(n || 0).toLocaleString('es-CO')}`
}

const SECCIONES = [
  { id: 'resumen', icon: '📊', label: 'Resumen' },
  { id: 'ingresos', icon: '💰', label: 'Ingresos' },
  { id: 'gastos', icon: '📋', label: 'Gastos' },
  { id: 'reservas', icon: '📅', label: 'Reservas' },
  { id: 'liquidacion', icon: '💸', label: 'Liquidación' },
]

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/propietario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin })
      })
      const data = await res.json()
      if (data.ok) {
        onLogin(data)
      } else {
        setError('PIN incorrecto. Intenta de nuevo.')
        setPin('')
      }
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '0.2em', color: C.primary }}>WELLCOMM</div>
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: C.muted, marginTop: '0.25rem' }}>PORTAL DEL PROPIETARIO</div>
      </div>

      <div style={{ background: '#2a2a2a', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 320 }}>
        <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.5rem', textAlign: 'center' }}>
          Introduce tu PIN para acceder
        </div>

        {/* Teclado numérico */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${pin.length > i ? C.primary : '#444'}`, background: pin.length > i ? C.primary : 'transparent', transition: 'all 0.2s' }} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
            <button key={i} onClick={() => {
              if (n === '⌫') { setPin(p => p.slice(0, -1)); setError('') }
              else if (n !== '' && pin.length < 4) { const np = pin + n; setPin(np); if (np.length === 4) setTimeout(() => {}, 100) }
            }} style={{
              background: n === '' ? 'transparent' : '#333',
              color: 'white', border: 'none', borderRadius: 12,
              padding: '1rem', fontSize: '1.2rem', cursor: n === '' ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)'
            }}>{n}</button>
          ))}
        </div>

        {error && <div style={{ color: '#e74c3c', fontSize: '0.78rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <button onClick={handleLogin} disabled={pin.length < 4 || loading} style={{
          width: '100%', background: pin.length >= 4 ? C.primary : '#333',
          color: pin.length >= 4 ? C.dark : '#666',
          border: 'none', borderRadius: 12, padding: '0.875rem',
          fontSize: '0.88rem', fontWeight: 600, cursor: pin.length >= 4 ? 'pointer' : 'default',
          fontFamily: 'var(--font-body)', transition: 'all 0.2s'
        }}>
          {loading ? 'Verificando...' : 'Acceder →'}
        </button>
      </div>
    </div>
  )
}

function GastosForm({ gastos, onChange, mes }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function guardar() {
    setSaving(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar_gastos', mes, gastos })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const Input = ({ label, field, section }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ fontSize: '0.7rem', color: C.muted, letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.light}`, borderRadius: 8, background: C.white, overflow: 'hidden' }}>
        <span style={{ padding: '0 0.5rem', fontSize: '0.78rem', color: C.muted, borderRight: `1px solid ${C.light}`, paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>COP</span>
        <input
          type="number"
          value={gastos[section][field] || ''}
          onChange={e => onChange(section, field, Number(e.target.value))}
          placeholder="0"
          style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}
        />
      </div>
    </div>
  )

  return (
    <div>
      {/* Ingresos */}
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', color: C.dark, borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>
          💰 Ingresos del mes
        </div>
        <Input label="Habitaciones (Cloudbeds)" field="habitaciones" section="ingresos" />
        <Input label="Terraza / F&B (Poster)" field="terraza" section="ingresos" />
        <Input label="Spa Siana" field="spa" section="ingresos" />
        <Input label="Upselling y servicios extra" field="upselling" section="ingresos" />
        <Input label="Otros ingresos" field="otrosIngresos" section="ingresos" />
      </div>

      {/* Gastos Fijos */}
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', color: C.dark, borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>
          🏢 Gastos Fijos
        </div>
        <Input label="Nómina total" field="nomina" section="fijos" />
        <Input label="Arriendo del local" field="arriendo" section="fijos" />
        <Input label="Servicios públicos (agua, luz, gas)" field="serviciosPublicos" section="fijos" />
        <Input label="Internet y telefonía" field="internet" section="fijos" />
        <Input label="Seguros" field="seguros" section="fijos" />
        <Input label="Cloudbeds (PMS)" field="cloudbeds" section="fijos" />
        <Input label="PricePoint (Revenue)" field="pricepoint" section="fijos" />
        <Input label="Siana (Spa software)" field="siana" section="fijos" />
        <Input label="Poster (F&B)" field="poster" section="fijos" />
        <Input label="Otros gastos fijos" field="otrosFijos" section="fijos" />
      </div>

      {/* Gastos Variables */}
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', color: C.dark, borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>
          📦 Gastos Variables
        </div>
        <Input label="Amenities (jabón, shampoo, aromaterapia)" field="amenities" section="variables" />
        <Input label="Lavandería y lencería" field="lavanderia" section="variables" />
        <Input label="Desayunos y F&B básico" field="desayunos" section="variables" />
        <Input label="Comisión Booking.com" field="comisionBooking" section="variables" />
        <Input label="Comisión Expedia" field="comisionExpedia" section="variables" />
        <Input label="Comisión Airbnb" field="comisionAirbnb" section="variables" />
        <Input label="Mantenimiento correctivo" field="mantenimiento" section="variables" />
        <Input label="Otros gastos variables" field="otrosVariables" section="variables" />
      </div>

      <button onClick={guardar} disabled={saving} style={{
        width: '100%', background: saved ? C.primary : C.dark,
        color: C.white, border: 'none', borderRadius: 12,
        padding: '0.875rem', fontSize: '0.88rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-body)'
      }}>
        {saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar datos del mes'}
      </button>
    </div>
  )
}

export default function OwnerPortal({ onBack }) {
  const [user, setUser] = useState(null)
  const [seccion, setSeccion] = useState('resumen')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    if (user) cargarDatos()
  }, [user, mes])

  async function cargarDatos() {
    setLoading(true)
    try {
      const res = await fetch(`/api/propietario?mes=${mes}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleGastoChange(section, field, value) {
    setData(prev => ({
      ...prev,
      gastos: {
        ...prev.gastos,
        [section]: { ...prev.gastos[section], [field]: value }
      }
    }))
  }

  if (!user) return <LoginScreen onLogin={u => setUser(u)} />

  const r = data?.resumen || {}
  const cb = data?.cloudbeds || {}

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ background: C.dark, padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: C.primary, fontSize: 16, letterSpacing: 3, fontWeight: 700, fontFamily: 'var(--font-display)' }}>WELLCOMM</span>
              <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2 }}>✳ PROPIETARIOS</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>Hola, {user.nombre} · {mes}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ background: '#333', color: 'white', border: 'none', borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontFamily: 'var(--font-body)' }} />
            <button onClick={() => setUser(null)} style={{ background: 'none', border: `1px solid #444`, borderRadius: 8, color: '#aaa', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.7rem' }}>Salir</button>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', overflowX: 'auto', borderTop: `1px solid rgba(255,255,255,0.1)` }}>
          {SECCIONES.map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)} style={{
              flex: '0 0 auto', background: seccion === s.id ? C.primary : 'transparent',
              color: seccion === s.id ? C.dark : '#aaa',
              border: 'none', cursor: 'pointer', padding: '8px 10px',
              fontSize: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              fontFamily: 'var(--font-body)', minWidth: 60,
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontWeight: seccion === s.id ? 700 : 400 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', paddingBottom: '2rem' }}>
        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: C.muted, fontFamily: 'var(--font-display)' }}>Cargando datos...</div>}

        {!loading && data && (
          <>
            {/* RESUMEN */}
            {seccion === 'resumen' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Resumen Ejecutivo</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>{mes} · WELLcomm Spa & Hotel</div>

                {/* KPIs Cloudbeds en vivo */}
                <div style={{ background: C.dark, borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', color: C.primary, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>✳ DATOS EN VIVO · CLOUDBEDS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'OCUPACIÓN', val: `${cb.ocupacion || 0}%`, sub: `${cb.enCasa || 0}/25 hab.` },
                      { label: 'ADR', val: fmt(cb.adr), sub: 'Tarifa media' },
                      { label: 'RevPAR', val: fmt(cb.revpar), sub: 'Por hab. disp.' },
                    ].map((k, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ color: C.primary, fontSize: '1.3rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{k.val}</div>
                        <div style={{ color: '#888', fontSize: '0.65rem', letterSpacing: '0.05em' }}>{k.label}</div>
                        <div style={{ color: '#666', fontSize: '0.62rem' }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPIs financieros */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { icon: '💰', label: 'INGRESOS TOTALES', val: fmt(r.totalIngresos), sub: fmtCOP(r.totalIngresos), color: C.primary },
                    { icon: '📋', label: 'GASTOS TOTALES', val: fmt(r.totalGastos), sub: fmtCOP(r.totalGastos), color: '#e67e22' },
                    { icon: '📊', label: 'GOP', val: fmt(r.GOP), sub: 'Gross Operating Profit', color: r.GOP > 0 ? C.primary : '#e74c3c' },
                    { icon: '✅', label: 'UTILIDAD NETA', val: fmt(r.utilidadNeta), sub: 'Después de fee SOLARA', color: r.utilidadNeta > 0 ? C.primary : '#e74c3c' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 12, padding: '1rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{k.icon}</div>
                      <div style={{ fontSize: '0.65rem', color: C.muted, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{k.val}</div>
                      <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.15rem' }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Fee SOLARA */}
                <div style={{ background: C.dark, borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ color: C.primary, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
                    ✳ Fee SOLARA — {mes}
                  </div>
                  {[
                    { label: 'Fee fijo mensual', val: fmtCOP(r.feeSolaraFijo), color: '#aaa' },
                    { label: `Fee variable (5% GOP = 5% de ${fmtCOP(r.GOP)})`, val: fmtCOP(r.feeSolaraVariable), color: '#aaa' },
                    { label: 'Total fee SOLARA', val: fmtCOP(r.feeSolaraTotal), color: C.primary, bold: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 2 ? `1px solid rgba(255,255,255,0.08)` : 'none' }}>
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>{row.label}</span>
                      <span style={{ fontSize: '0.82rem', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INGRESOS */}
            {seccion === 'ingresos' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '1.25rem' }}>Ingresos del Mes</div>

                {/* Por fuente */}
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Por fuente</div>
                  {[
                    { label: '🏨 Habitaciones', val: data.gastos.ingresos.habitaciones, fuente: 'Cloudbeds' },
                    { label: '🍕 Terraza / F&B', val: data.gastos.ingresos.terraza, fuente: 'Poster' },
                    { label: '💆 Spa Siana', val: data.gastos.ingresos.spa, fuente: 'Siana' },
                    { label: '✨ Upselling', val: data.gastos.ingresos.upselling, fuente: 'Manual' },
                    { label: '📦 Otros', val: data.gastos.ingresos.otrosIngresos, fuente: 'Manual' },
                  ].map((item, i) => {
                    const pct = r.totalIngresos > 0 ? Math.round((item.val / r.totalIngresos) * 100) : 0
                    return (
                      <div key={i} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.82rem', color: C.dark }}>{item.label}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: C.dark }}>{fmtCOP(item.val)}</span>
                        </div>
                        <div style={{ background: C.light, borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: C.primary, height: 6, borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.15rem' }}>{pct}% · Fuente: {item.fuente}</div>
                      </div>
                    )
                  })}
                  <div style={{ borderTop: `2px solid ${C.dark}`, paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>Total ingresos</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: C.primary }}>{fmtCOP(r.totalIngresos)}</span>
                  </div>
                </div>

                {/* Reservas actuales Cloudbeds */}
                {cb.reservas?.length > 0 && (
                  <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>🏨 Huéspedes en casa · Cloudbeds</div>
                    {cb.reservas.map((r2, i) => (
                      <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < cb.reservas.length - 1 ? `1px solid ${C.light}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r2.huesped}</div>
                          <div style={{ fontSize: '0.68rem', color: C.muted }}>Hab. {r2.habitacion} · Sale: {r2.checkout} · {r2.canal}</div>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.primary }}>{fmtCOP(r2.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GASTOS */}
            {seccion === 'gastos' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Gastos del Mes</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Introduce los gastos del mes para calcular la liquidación</div>

                {/* Resumen rápido */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Gastos fijos', val: r.totalFijos, color: '#3498db' },
                    { label: 'Gastos variables', val: r.totalVariables, color: '#e67e22' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '0.875rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{fmt(k.val)}</div>
                      <div style={{ fontSize: '0.65rem', color: C.muted }}>{fmtCOP(k.val)}</div>
                    </div>
                  ))}
                </div>

                <GastosForm gastos={data.gastos} onChange={handleGastoChange} mes={mes} />
              </div>
            )}

            {/* RESERVAS */}
            {seccion === 'reservas' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '1.25rem' }}>Reservas en Casa</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'En casa', val: cb.enCasa || 0, emoji: '🏡' },
                    { label: 'Ocupación', val: `${cb.ocupacion || 0}%`, emoji: '📈' },
                    { label: 'ADR', val: fmt(cb.adr), emoji: '💵' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '0.875rem', textAlign: 'center', border: `1px solid ${C.light}` }}>
                      <div style={{ fontSize: '1.5rem' }}>{k.emoji}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{k.val}</div>
                      <div style={{ fontSize: '0.68rem', color: C.muted }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {cb.reservas?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cb.reservas.map((res2, i) => (
                      <div key={i} style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', border: `1px solid ${C.light}`, borderLeft: `3px solid ${C.primary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{res2.huesped}</div>
                            <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '0.2rem' }}>Hab. {res2.habitacion}</div>
                            <div style={{ fontSize: '0.72rem', color: C.muted }}>Sale: {res2.checkout}</div>
                            <div style={{ fontSize: '0.68rem', background: C.bg, color: C.muted, padding: '0.15rem 0.5rem', borderRadius: 10, marginTop: '0.3rem', display: 'inline-block' }}>{res2.canal}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.primary }}>{fmtCOP(res2.total)}</div>
                            <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.15rem' }}>In house</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', color: C.muted, fontFamily: 'var(--font-display)' }}>Sin reservas activas en este momento</div>
                )}
              </div>
            )}

            {/* LIQUIDACIÓN */}
            {seccion === 'liquidacion' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Liquidación Mensual</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Resumen completo de {mes}</div>

                <div style={{ background: C.dark, borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ color: C.primary, fontSize: '0.78rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                    ✳ CUENTA DE RESULTADOS · {mes.toUpperCase()}
                  </div>
                  {[
                    { label: 'Ingresos habitaciones', val: data.gastos.ingresos.habitaciones, type: 'ingreso' },
                    { label: 'Ingresos terraza (Poster)', val: data.gastos.ingresos.terraza, type: 'ingreso' },
                    { label: 'Ingresos spa (Siana)', val: data.gastos.ingresos.spa, type: 'ingreso' },
                    { label: 'Upselling y otros', val: (data.gastos.ingresos.upselling || 0) + (data.gastos.ingresos.otrosIngresos || 0), type: 'ingreso' },
                    { label: '─── TOTAL INGRESOS', val: r.totalIngresos, type: 'subtotal' },
                    { label: 'Gastos fijos', val: -r.totalFijos, type: 'gasto' },
                    { label: 'Gastos variables', val: -r.totalVariables, type: 'gasto' },
                    { label: '─── GOP (Gross Operating Profit)', val: r.GOP, type: 'subtotal' },
                    { label: 'Fee fijo SOLARA', val: -r.feeSolaraFijo, type: 'fee' },
                    { label: `Fee variable SOLARA (5% GOP)`, val: -r.feeSolaraVariable, type: 'fee' },
                    { label: '═══ UTILIDAD NETA', val: r.utilidadNeta, type: 'total' },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderBottom: ['subtotal', 'total'].includes(row.type) ? `1px solid rgba(255,255,255,0.15)` : `1px solid rgba(255,255,255,0.05)`,
                      marginTop: row.type === 'total' ? '0.5rem' : 0
                    }}>
                      <span style={{ fontSize: row.type === 'total' ? '0.85rem' : '0.75rem', color: row.type === 'subtotal' ? '#ddd' : row.type === 'total' ? C.white : '#888', fontWeight: ['subtotal', 'total'].includes(row.type) ? 600 : 400 }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: row.type === 'total' ? '0.95rem' : '0.82rem', fontWeight: ['subtotal', 'total'].includes(row.type) ? 700 : 400, color: row.type === 'total' ? (r.utilidadNeta >= 0 ? C.primary : '#e74c3c') : row.type === 'subtotal' ? '#ddd' : row.type === 'fee' ? '#e67e22' : row.val >= 0 ? C.primary : '#888' }}>
                        {row.val >= 0 ? fmtCOP(row.val) : `- ${fmtCOP(Math.abs(row.val))}`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Porcentajes */}
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Estructura de costos</div>
                  {[
                    { label: 'Gastos fijos / Ingresos', val: r.totalIngresos > 0 ? Math.round((r.totalFijos / r.totalIngresos) * 100) : 0, color: '#3498db' },
                    { label: 'Gastos variables / Ingresos', val: r.totalIngresos > 0 ? Math.round((r.totalVariables / r.totalIngresos) * 100) : 0, color: '#e67e22' },
                    { label: 'Fee SOLARA / Ingresos', val: r.totalIngresos > 0 ? Math.round((r.feeSolaraTotal / r.totalIngresos) * 100) : 0, color: C.primary },
                    { label: 'Margen neto', val: r.totalIngresos > 0 ? Math.round((r.utilidadNeta / r.totalIngresos) * 100) : 0, color: C.primaryDark },
                  ].map((k, i) => (
                    <div key={i} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.78rem', color: C.muted }}>{k.label}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: k.color }}>{k.val}%</span>
                      </div>
                      <div style={{ background: C.light, borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${Math.min(Math.abs(k.val), 100)}%`, background: k.color, height: 6, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
