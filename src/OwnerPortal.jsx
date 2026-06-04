import { useState, useEffect } from 'react'

const C = {
  bg: '#E8F0EC', dark: '#1A1A1A', primary: '#7EC8A0', primaryDark: '#5aaa80',
  text: '#1A1A1A', muted: '#7a8c82', light: '#d0ddd5', white: '#FFFFFF', gold: '#7EC8A0',
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}
function fmtCOP(n) { return `COP ${Number(n || 0).toLocaleString('es-CO')}` }

const SECCIONES = [
  { id: 'resumen', icon: '📊', label: 'Resumen' },
  { id: 'ingresos', icon: '💰', label: 'Ingresos' },
  { id: 'recibos', icon: '🧾', label: 'Recibos' },
  { id: 'gastos', icon: '📋', label: 'Gastos' },
  { id: 'liquidacion', icon: '💸', label: 'Liquidación' },
]

const COLOR_CAT = {
  'F&B': '#e67e22', 'Spa': '#9b59b6', 'Habitaciones': '#3498db',
  'Mantenimiento': '#e74c3c', 'Legal': '#34495e', 'Servicios': '#16a085',
  'Nómina': '#f39c12', 'Marketing': '#e91e63', 'Otros': '#95a5a6'
}

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (pin.length < 4) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin })
      })
      const data = await res.json()
      if (data.ok) onLogin(data)
      else { setError('PIN incorrecto. Intenta de nuevo.'); setPin('') }
    } catch { setError('Error de conexión.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '0.2em', color: C.primary }}>WELLCOMM</div>
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: C.muted, marginTop: '0.25rem' }}>PORTAL DEL PROPIETARIO</div>
      </div>
      <div style={{ background: '#2a2a2a', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 320 }}>
        <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.5rem', textAlign: 'center' }}>Introduce tu PIN para acceder</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${pin.length > i ? C.primary : '#444'}`, background: pin.length > i ? C.primary : 'transparent', transition: 'all 0.2s' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
            <button key={i} onClick={() => {
              if (n === '⌫') { setPin(p => p.slice(0, -1)); setError('') }
              else if (n !== '' && pin.length < 4) setPin(pin + n)
            }} style={{
              background: n === '' ? 'transparent' : '#333', color: 'white', border: 'none',
              borderRadius: 12, padding: '1rem', fontSize: '1.2rem',
              cursor: n === '' ? 'default' : 'pointer', fontFamily: 'var(--font-body)'
            }}>{n}</button>
          ))}
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: '0.78rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}
        <button onClick={handleLogin} disabled={pin.length < 4 || loading} style={{
          width: '100%', background: pin.length >= 4 ? C.primary : '#333',
          color: pin.length >= 4 ? C.dark : '#666', border: 'none', borderRadius: 12,
          padding: '0.875rem', fontSize: '0.88rem', fontWeight: 600,
          cursor: pin.length >= 4 ? 'pointer' : 'default', fontFamily: 'var(--font-body)'
        }}>{loading ? 'Verificando...' : 'Acceder →'}</button>
      </div>
    </div>
  )
}

// ── NUEVA SECCIÓN: Subir recibo PDF con IA ──────────────────────────
function RecibosSection({ data, mes, onReload }) {
  const [leyendo, setLeyendo] = useState(false)
  const [extraido, setExtraido] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setErrorMsg('Por favor sube un archivo PDF')
      return
    }
    setErrorMsg(''); setLeyendo(true); setExtraido(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leer_recibo', pdfBase64: base64 })
      })
      const d = await res.json()
      if (d.ok) setExtraido(d.datos)
      else setErrorMsg('No se pudo leer el PDF')
    } catch {
      setErrorMsg('Error procesando el archivo')
    } finally {
      setLeyendo(false)
    }
  }

  async function confirmar() {
    setGuardando(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar_recibo', mes, recibo: extraido })
      })
      setExtraido(null)
      await onReload()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id) {
    await fetch('/api/propietario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'eliminar_recibo', mes, id })
    })
    await onReload()
  }

  const recibos = data.recibos || []
  const porCat = data.gastosPorCategoria || {}
  const categorias = data.categorias || []

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Recibos y Gastos</div>
      <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Sube el PDF de un pago y la IA extrae el importe y lo clasifica</div>

      {/* Zona de carga */}
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: `2px dashed ${C.light}`, borderRadius: 12, padding: '2rem 1rem',
          cursor: 'pointer', background: C.bg
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: C.dark }}>
            {leyendo ? 'Leyendo recibo con IA...' : 'Subir recibo PDF'}
          </div>
          <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>
            {leyendo ? 'Un momento por favor' : 'Toca para seleccionar el archivo'}
          </div>
          <input type="file" accept="application/pdf" disabled={leyendo}
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }} />
        </label>
        {errorMsg && <div style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>{errorMsg}</div>}
      </div>

      {/* Datos extraídos para confirmar */}
      {extraido && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `2px solid ${C.primary}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', color: C.primaryDark }}>✓ Revisa y confirma</div>

          <CampoEdit label="Proveedor" value={extraido.proveedor} onChange={v => setExtraido({ ...extraido, proveedor: v })} />
          <CampoEditNum label="Importe (COP)" value={extraido.importe} onChange={v => setExtraido({ ...extraido, importe: v })} />
          <CampoEdit label="Fecha" value={extraido.fecha} onChange={v => setExtraido({ ...extraido, fecha: v })} type="date" />
          <CampoEdit label="Concepto" value={extraido.concepto} onChange={v => setExtraido({ ...extraido, concepto: v })} />

          <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem', marginTop: '0.75rem' }}>Categoría</label>
          <select value={extraido.categoria} onChange={e => setExtraido({ ...extraido, categoria: e.target.value })}
            style={{ width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: '0.88rem', fontFamily: 'var(--font-body)', background: C.white, marginBottom: '1rem' }}>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setExtraido(null)} style={{ flex: 1, background: C.bg, color: C.muted, border: `1px solid ${C.light}`, borderRadius: 10, padding: '0.75rem', fontSize: '0.82rem', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={confirmar} disabled={guardando} style={{ flex: 2, background: C.dark, color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : '✓ Confirmar y sumar al mes'}
            </button>
          </div>
        </div>
      )}

      {/* Gastos por categoría */}
      {data.totalRecibos > 0 && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Gastos por categoría</div>
          {categorias.filter(c => porCat[c] > 0).sort((a, b) => porCat[b] - porCat[a]).map(cat => {
            const pct = data.totalRecibos > 0 ? Math.round((porCat[cat] / data.totalRecibos) * 100) : 0
            return (
              <div key={cat} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: C.dark }}>{cat}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtCOP(porCat[cat])}</span>
                </div>
                <div style={{ background: C.light, borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${pct}%`, background: COLOR_CAT[cat] || C.primary, height: 6, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
          <div style={{ borderTop: `2px solid ${C.dark}`, paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>Total recibos</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(data.totalRecibos)}</span>
          </div>
        </div>
      )}

      {/* Lista de recibos */}
      {recibos.length > 0 && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Recibos del mes ({recibos.length})</div>
          {recibos.map((r, i) => (
            <div key={r.id} style={{ padding: '0.6rem 0', borderBottom: i < recibos.length - 1 ? `1px solid ${C.light}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r.proveedor || 'Sin nombre'}</div>
                <div style={{ fontSize: '0.68rem', color: C.muted }}>{r.fecha} · {r.concepto}</div>
                <span style={{ fontSize: '0.62rem', background: `${COLOR_CAT[r.categoria]}22`, color: COLOR_CAT[r.categoria], padding: '0.1rem 0.5rem', borderRadius: 10, display: 'inline-block', marginTop: '0.25rem' }}>{r.categoria}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(r.importe)}</div>
                <button onClick={() => eliminar(r.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.65rem', cursor: 'pointer', marginTop: '0.2rem' }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CampoEdit({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.6rem 0.75rem', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none' }} />
    </div>
  )
}
function CampoEditNum({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.light}`, borderRadius: 8, overflow: 'hidden' }}>
        <span style={{ padding: '0.6rem 0.6rem', fontSize: '0.78rem', color: C.muted, borderRight: `1px solid ${C.light}`, background: C.bg }}>COP</span>
        <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }} />
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar_gastos', mes, gastos })
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const Input = ({ label, field, section }) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.light}`, borderRadius: 8, background: C.white, overflow: 'hidden' }}>
        <span style={{ padding: '0.6rem 0.5rem', fontSize: '0.78rem', color: C.muted, borderRight: `1px solid ${C.light}` }}>COP</span>
        <input type="number" value={gastos[section][field] || ''} onChange={e => onChange(section, field, Number(e.target.value))}
          placeholder="0" style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }} />
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>💰 Ingresos del mes</div>
        <Input label="Habitaciones (Cloudbeds)" field="habitaciones" section="ingresos" />
        <Input label="Terraza / F&B (Poster)" field="terraza" section="ingresos" />
        <Input label="Upselling y servicios extra" field="upselling" section="ingresos" />
        <Input label="Otros ingresos" field="otrosIngresos" section="ingresos" />
      </div>

      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>🏢 Gastos Fijos</div>
        <Input label="Nómina total" field="nomina" section="fijos" />
        <Input label="Arriendo del local" field="arriendo" section="fijos" />
        <Input label="Servicios públicos (agua, luz, gas)" field="serviciosPublicos" section="fijos" />
        <Input label="Internet y telefonía" field="internet" section="fijos" />
        <Input label="Seguros" field="seguros" section="fijos" />
        <Input label="Cloudbeds (PMS)" field="cloudbeds" section="fijos" />
        <Input label="Otros gastos fijos" field="otrosFijos" section="fijos" />
      </div>

      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>📦 Gastos Variables</div>
        <Input label="Amenities" field="amenities" section="variables" />
        <Input label="Lavandería y lencería" field="lavanderia" section="variables" />
        <Input label="Desayunos y F&B básico" field="desayunos" section="variables" />
        <Input label="Comisión Booking.com" field="comisionBooking" section="variables" />
        <Input label="Comisión Expedia" field="comisionExpedia" section="variables" />
        <Input label="Comisión Airbnb" field="comisionAirbnb" section="variables" />
        <Input label="Mantenimiento correctivo" field="mantenimiento" section="variables" />
        <Input label="Otros gastos variables" field="otrosVariables" section="variables" />
      </div>

      <button onClick={guardar} disabled={saving} style={{
        width: '100%', background: saved ? C.primary : C.dark, color: C.white, border: 'none',
        borderRadius: 12, padding: '0.875rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)'
      }}>{saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar datos del mes'}</button>
    </div>
  )
}

export default function OwnerPortal({ onBack }) {
  const [user, setUser] = useState(null)
  const [seccion, setSeccion] = useState('resumen')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => { if (user) cargarDatos() }, [user, mes])

  async function cargarDatos() {
    setLoading(true)
    try {
      const res = await fetch(`/api/propietario?mes=${mes}`)
      setData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleGastoChange(section, field, value) {
    setData(prev => ({ ...prev, gastos: { ...prev.gastos, [section]: { ...prev.gastos[section], [field]: value } } }))
  }

  if (!user) return <LoginScreen onLogin={u => setUser(u)} />

  const r = data?.resumen || {}
  const cb = data?.cloudbeds || {}

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
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
        <div style={{ display: 'flex', overflowX: 'auto', borderTop: `1px solid rgba(255,255,255,0.1)` }}>
          {SECCIONES.map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)} style={{
              flex: '0 0 auto', background: seccion === s.id ? C.primary : 'transparent',
              color: seccion === s.id ? C.dark : '#aaa', border: 'none', cursor: 'pointer',
              padding: '8px 10px', fontSize: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
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
            {seccion === 'resumen' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Resumen Ejecutivo</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>{mes} · WELLcomm Spa & Hotel</div>

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
                        <div style={{ color: '#888', fontSize: '0.65rem' }}>{k.label}</div>
                        <div style={{ color: '#666', fontSize: '0.62rem' }}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {[
                    { icon: '💰', label: 'INGRESOS TOTALES', val: fmt(r.totalIngresos), sub: fmtCOP(r.totalIngresos), color: C.primary },
                    { icon: '📋', label: 'GASTOS TOTALES', val: fmt(r.totalGastos), sub: fmtCOP(r.totalGastos), color: '#e67e22' },
                    { icon: '📊', label: 'GOP', val: fmt(r.GOP), sub: 'Gross Operating Profit', color: r.GOP > 0 ? C.primary : '#e74c3c' },
                    { icon: '✅', label: 'UTILIDAD NETA', val: fmt(r.utilidadNeta), sub: 'Después de fee SOLARA', color: r.utilidadNeta > 0 ? C.primary : '#e74c3c' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 12, padding: '1rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{k.icon}</div>
                      <div style={{ fontSize: '0.65rem', color: C.muted, marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{k.val}</div>
                      <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.15rem' }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: C.dark, borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ color: C.primary, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>✳ Fee SOLARA — {mes}</div>
                  {[
                    { label: 'Fee fijo mensual', val: fmtCOP(r.feeSolaraFijo), color: '#aaa' },
                    { label: `Fee variable (5% GOP)`, val: fmtCOP(r.feeSolaraVariable), color: '#aaa' },
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

            {seccion === 'ingresos' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '1.25rem' }}>Ingresos del Mes</div>
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Por fuente</div>
                  {[
                    { label: '🏨 Habitaciones', val: data.gastos.ingresos.habitaciones, fuente: 'Cloudbeds' },
                    { label: '🍕 Terraza / F&B', val: data.gastos.ingresos.terraza, fuente: 'Poster' },
                    { label: '✨ Upselling', val: data.gastos.ingresos.upselling, fuente: 'Manual' },
                    { label: '📦 Otros', val: data.gastos.ingresos.otrosIngresos, fuente: 'Manual' },
                  ].map((item, i) => {
                    const pct = r.totalIngresos > 0 ? Math.round((item.val / r.totalIngresos) * 100) : 0
                    return (
                      <div key={i} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.82rem' }}>{item.label}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{fmtCOP(item.val)}</span>
                        </div>
                        <div style={{ background: C.light, borderRadius: 4, height: 6 }}>
                          <div style={{ width: `${pct}%`, background: C.primary, height: 6, borderRadius: 4 }} />
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

                {cb.reservasActuales?.length > 0 && (
                  <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>🏨 Huéspedes en casa · Cloudbeds</div>
                    {cb.reservasActuales.map((r2, i) => (
                      <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < cb.reservasActuales.length - 1 ? `1px solid ${C.light}` : 'none', display: 'flex', justifyContent: 'space-between' }}>
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

            {seccion === 'recibos' && <RecibosSection data={data} mes={mes} onReload={cargarDatos} />}

            {seccion === 'gastos' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Gastos Manuales</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Gastos recurrentes que no vienen de recibos PDF</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Fijos', val: r.totalFijos, color: '#3498db' },
                    { label: 'Variables', val: r.totalVariables, color: '#e67e22' },
                    { label: 'Recibos PDF', val: r.totalRecibos, color: '#9b59b6' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '0.75rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{fmt(k.val)}</div>
                    </div>
                  ))}
                </div>
                <GastosForm gastos={data.gastos} onChange={handleGastoChange} mes={mes} />
              </div>
            )}

            {seccion === 'liquidacion' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Liquidación Mensual</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Resumen completo de {mes}</div>
                <div style={{ background: C.dark, borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ color: C.primary, fontSize: '0.78rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>✳ CUENTA DE RESULTADOS · {mes.toUpperCase()}</div>
                  {[
                    { label: 'Ingresos habitaciones', val: data.gastos.ingresos.habitaciones, type: 'ingreso' },
                    { label: 'Ingresos terraza (Poster)', val: data.gastos.ingresos.terraza, type: 'ingreso' },
                    { label: 'Upselling y otros', val: (data.gastos.ingresos.upselling || 0) + (data.gastos.ingresos.otrosIngresos || 0), type: 'ingreso' },
                    { label: '─── TOTAL INGRESOS', val: r.totalIngresos, type: 'subtotal' },
                    { label: 'Gastos fijos', val: -r.totalFijos, type: 'gasto' },
                    { label: 'Gastos variables', val: -r.totalVariables, type: 'gasto' },
                    { label: 'Recibos PDF', val: -r.totalRecibos, type: 'gasto' },
                    { label: '─── GOP (Gross Operating Profit)', val: r.GOP, type: 'subtotal' },
                    { label: 'Fee fijo SOLARA', val: -r.feeSolaraFijo, type: 'fee' },
                    { label: 'Fee variable SOLARA (5% GOP)', val: -r.feeSolaraVariable, type: 'fee' },
                    { label: '═══ UTILIDAD NETA', val: r.utilidadNeta, type: 'total' },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
                      borderBottom: ['subtotal', 'total'].includes(row.type) ? `1px solid rgba(255,255,255,0.15)` : `1px solid rgba(255,255,255,0.05)`,
                      marginTop: row.type === 'total' ? '0.5rem' : 0
                    }}>
                      <span style={{ fontSize: row.type === 'total' ? '0.85rem' : '0.75rem', color: row.type === 'subtotal' ? '#ddd' : row.type === 'total' ? C.white : '#888', fontWeight: ['subtotal', 'total'].includes(row.type) ? 600 : 400 }}>{row.label}</span>
                      <span style={{ fontSize: row.type === 'total' ? '0.95rem' : '0.82rem', fontWeight: ['subtotal', 'total'].includes(row.type) ? 700 : 400, color: row.type === 'total' ? (r.utilidadNeta >= 0 ? C.primary : '#e74c3c') : row.type === 'subtotal' ? '#ddd' : row.type === 'fee' ? '#e67e22' : row.val >= 0 ? C.primary : '#888' }}>
                        {row.val >= 0 ? fmtCOP(row.val) : `- ${fmtCOP(Math.abs(row.val))}`}
                      </span>
                    </div>
                  ))}
                </div>

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
