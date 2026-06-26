import React, { useState, useEffect, useRef } from 'react'
import { exportarPDFPresupuesto, exportarExcelPresupuesto } from './exportInforme'
import {
  GASTOS, SECCIONES_GASTOS, BLOQUES_GASTOS, CUENTAS_SIN_MOVIMIENTO,
  realMes, totalCuenta, gastosDeSeccion, totalSeccionMes, totalSeccion,
  totalBloqueMes, totalBloque, totalGeneralMes, acumulado,
} from '../api/gastos'

function fmt(n) {
  if (!n) return '$0'
  return `$${Math.round(n / 1000)}K`
}

function fmtCOP(n) {
  return `COP ${Number(n || 0).toLocaleString('es-CO')}`
}

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'tarifas', label: '💰 Tarifas' },
  { id: 'competencia', label: '🏆 Competencia' },
  { id: 'eventos', label: '📅 Eventos' },
  { id: 'presupuesto', label: '📈 Ppto vs Real' },
  { id: 'ppto360', label: '💎 Ppto 360' },
  { id: 'gastos', label: '🧾 Gastos' },
  { id: 'copilot', label: '🤖 Copilot' },
]

const COMPETENCIA_LISTA = [
  'Botánica Casa Hotel Manila',
  'Celestino Boutique Hotel & Spa',
  'Golden Valley Hotel',
  'Landmark Hotel',
  'Moabi Hotel',
  'Nomada Hotel Origen',
  'Sloh Hotel & Bar Manila',
  'The Host Medellin Adults Only',
  'The Somos Bold',
]

export default function RevenueManager({ onBack }) {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [habSeleccionada, setHabSeleccionada] = useState('estandar')
  const [preciosComp, setPreciosComp] = useState({})
  const [savingComp, setSavingComp] = useState(false)
  const [savedComp, setSavedComp] = useState(false)
  const [copilotMsgs, setCopilotMsgs] = useState([{
    role: 'assistant',
    text: '📊 Hola, soy tu Revenue Manager IA.\n\nTengo acceso en tiempo real a tu ocupación, ADR real de Cloudbeds, tarifas, competencia, eventos y presupuesto de Medellín.\n\n¿Qué analizamos hoy?'
  }])
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const bottomRef = useRef(null)

  // Estado del presupuesto (habitaciones)
  const [pptoData, setPptoData] = useState(null)
  const [pptoLoading, setPptoLoading] = useState(false)
  const [pptoMes, setPptoMes] = useState(new Date().toISOString().slice(0, 7))

  // Estado del Ppto 360 (3 líneas)
  const [p360Data, setP360Data] = useState(null)
  const [p360Loading, setP360Loading] = useState(false)
  const [p360Mes, setP360Mes] = useState(new Date().toISOString().slice(0, 7))

  // Estado de Gastos (datos estáticos Siigo Ene–May, importados de api/gastos)
  const [gastosPeriodo, setGastosPeriodo] = useState('acum')
  const [gastosOpen, setGastosOpen] = useState(null)

  useEffect(() => { cargar() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [copilotMsgs])

  useEffect(() => {
    if (tab === 'presupuesto') cargarPresupuesto()
  }, [tab, pptoMes])

  useEffect(() => {
    if (tab === 'ppto360') cargarP360()
  }, [tab, p360Mes])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/revenue?accion=dashboard')
      const d = await res.json()
      setData(d)
      const compInit = {}
      COMPETENCIA_LISTA.forEach(hotel => {
        compInit[hotel] = {
          precio: d.competencia?.[hotel]?.precio || 0,
          actualizado: d.competencia?.[hotel]?.actualizado || null,
          esManual: d.competencia?.[hotel]?.esManual || false,
          notas: d.competencia?.[hotel]?.notas || ''
        }
      })
      setPreciosComp(compInit)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function cargarPresupuesto() {
    setPptoLoading(true)
    try {
      const res = await fetch(`/api/revenue?accion=presupuesto&mes=${pptoMes}`)
      const d = await res.json()
      setPptoData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setPptoLoading(false)
    }
  }

  async function cargarP360() {
    setP360Loading(true)
    try {
      const res = await fetch(`/api/revenue?accion=presupuesto_lineas&mes=${p360Mes}`)
      const d = await res.json()
      setP360Data(d)
    } catch (e) {
      console.error(e)
    } finally {
      setP360Loading(false)
    }
  }

  async function guardarCompetencia() {
    setSavingComp(true)
    try {
      await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_competencia', precios: preciosComp })
      })
      setSavedComp(true)
      setTimeout(() => setSavedComp(false), 2000)
      await cargar()
    } finally {
      setSavingComp(false)
    }
  }

  async function enviarCopilot() {
    if (!copilotInput.trim() || copilotLoading) return
    const pregunta = copilotInput.trim()
    setCopilotMsgs(prev => [...prev, { role: 'user', text: pregunta }])
    setCopilotInput('')
    setCopilotLoading(true)
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'copilot', pregunta })
      })
      const d = await res.json()
      setCopilotMsgs(prev => [...prev, { role: 'assistant', text: d.respuesta }])
    } catch {
      setCopilotMsgs(prev => [...prev, { role: 'assistant', text: 'Error de conexión.' }])
    } finally {
      setCopilotLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-light)' }}>Cargando Revenue Manager...</div>
    </div>
  )

  const recHoy = data?.recomendaciones?.[habSeleccionada]?.[0]
  const hab = data?.habitaciones?.[habSeleccionada]
  const mediaComp = Object.values(data?.competencia || {}).reduce((sum, h) => sum + (h.precio || 0), 0) / Object.keys(data?.competencia || {}).length

  const fmtPct = (v) => `${Math.round((v || 0) * 100)}%`
  const colorCumplimiento = (pct) => pct >= 95 ? '#27ae60' : pct >= 80 ? '#e67e22' : '#e74c3c'
  const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // ── Helpers Gastos ──
  const fmtGasto = (n) => {
    const abs = Math.abs(n || 0)
    const s = abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace('.', ',')}M` : `$${Math.round(abs / 1000)}K`
    return (n || 0) > 0 ? `+${s}` : s
  }
  const gValSeccion = (id) => gastosPeriodo === 'acum' ? totalSeccion(id) : totalSeccionMes(id, gastosPeriodo)
  const gValBloque = (b) => gastosPeriodo === 'acum' ? totalBloque(b) : totalBloqueMes(b, gastosPeriodo)
  const gValCuenta = (c) => gastosPeriodo === 'acum' ? totalCuenta(c) : realMes(c, gastosPeriodo)
  const gTotalGen = gastosPeriodo === 'acum' ? acumulado() : totalGeneralMes(gastosPeriodo)
  const gBloques = Object.keys(BLOQUES_GASTOS)
    .map(b => ({ id: b, nombre: BLOQUES_GASTOS[b], val: gValBloque(b) }))
    .sort((a, b) => a.val - b.val)
  const gMaxAbs = Math.max(...gBloques.map(b => Math.abs(b.val)), 1)
  const GASTOS_PERIODOS = [
    { id: 'acum', label: 'Acum.' },
    { id: 'enero', label: 'Ene' },
    { id: 'febrero', label: 'Feb' },
    { id: 'marzo', label: 'Mar' },
    { id: 'abril', label: 'Abr' },
    { id: 'mayo', label: 'May' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Revenue Manager</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
              WELLCOMM · Occ. {data?.ocupacionActual}% · ADR {fmt(data?.adrReal)} · RevPAR {fmt(data?.revparReal)}
            </div>
          </div>
          <button onClick={cargar} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>↻</button>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'white' : 'rgba(255,255,255,0.1)',
              color: tab === t.id ? 'var(--color-text)' : 'white',
              border: 'none', borderRadius: '8px 8px 0 0',
              padding: '0.5rem 0.75rem', fontSize: '0.68rem',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: tab === t.id ? 600 : 400
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            {data?.alertas?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.alertas.map((alerta, i) => (
                  <div key={i} style={{ background: `${alerta.color}15`, border: `1px solid ${alerta.color}`, borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: alerta.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 500 }}>{alerta.mensaje}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Ocupación', val: `${data?.ocupacionActual}%`, sub: `${data?.enCasa}/25 hab.`, color: data?.ocupacionActual >= 70 ? '#27ae60' : data?.ocupacionActual >= 50 ? '#e67e22' : '#e74c3c' },
                { label: 'ADR Real', val: fmt(data?.adrReal), sub: `Target $430K`, color: data?.adrReal >= 430000 ? '#27ae60' : '#e67e22' },
                { label: 'RevPAR', val: fmt(data?.revparReal), sub: `Target $301K`, color: data?.revparReal >= 301000 ? '#27ae60' : '#e67e22' },
                { label: 'On the Books', val: data?.reservasFuturas || 0, sub: 'Reservas futuras', color: 'var(--color-primary)' },
              ].map((k, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '1rem', boxShadow: 'var(--shadow)', borderTop: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', marginBottom: '0.25rem' }}>{k.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600, fontFamily: 'var(--font-display)', color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>🏆 Posición vs Competencia</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>Media mercado Manila</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{fmt(mediaComp)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>⭐ WELLcomm BAR Estándar</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(480000)}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                {mediaComp > 0 ? (
                  480000 > mediaComp
                    ? `▲ ${(((480000/mediaComp)-1)*100).toFixed(1)}% sobre la media — bien posicionado`
                    : `▼ ${(((mediaComp/480000)-1)*100).toFixed(1)}% bajo la media — revisar estrategia`
                ) : 'Actualiza precios de competencia para ver posición'}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📊 Recomendaciones de hoy</div>
              {Object.entries(data?.recomendaciones || {}).map(([tipo, fechas]) => {
                const hoy = fechas[0]
                return (
                  <div key={tipo} onClick={() => { setHabSeleccionada(tipo); setTab('tarifas') }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{hoy.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>BAR actual: {fmt(hoy.barActual)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: hoy.accionColor }}>{fmt(hoy.barRecomendado)}</div>
                      <div style={{ fontSize: '0.65rem', color: hoy.accionColor }}>{hoy.accionLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {data?.eventosProximos?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📅 Próximos eventos</div>
                {data.eventosProximos.slice(0, 3).map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ev.nombre}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{ev.inicio} → {ev.fin}</div>
                    </div>
                    <div style={{ background: ev.tipo === 'mega' ? '#e74c3c' : ev.tipo === 'alto' ? '#e67e22' : '#f39c12', color: 'white', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 600 }}>
                      +{Math.round((ev.factor - 1) * 100)}% demanda
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TARIFAS */}
        {tab === 'tarifas' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.entries(data?.habitaciones || {}).map(([tipo, h]) => {
                const rec = data?.recomendaciones?.[tipo]?.[0]
                return (
                  <button key={tipo} onClick={() => setHabSeleccionada(tipo)} style={{
                    background: habSeleccionada === tipo ? 'var(--color-text)' : 'white',
                    color: habSeleccionada === tipo ? 'white' : 'var(--color-text)',
                    border: `1px solid ${habSeleccionada === tipo ? 'var(--color-text)' : 'var(--color-border)'}`,
                    borderRadius: 10, padding: '0.75rem', cursor: 'pointer', textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{h.nombre}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.15rem' }}>{h.cantidad} hab · {h.m2}m²</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.25rem', color: habSeleccionada === tipo ? 'var(--color-primary)' : rec?.accionColor }}>
                      {fmt(rec?.barRecomendado)}
                    </div>
                  </button>
                )
              })}
            </div>

            {recHoy && hab && (
              <>
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>BAR OBJETIVO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 300 }}>{hab.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>{hab.descripcion}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Mínimo', val: fmt(hab.minimo), color: '#e74c3c' },
                      { label: 'BAR Recomendado', val: fmt(recHoy.barRecomendado), color: 'var(--color-primary)' },
                      { label: 'Máximo', val: fmt(hab.maximo), color: '#27ae60' },
                    ].map((k, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: k.color }}>{k.val}</div>
                        <div style={{ fontSize: '0.62rem', color: '#888', marginTop: '0.15rem' }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>🧠 Por qué esta tarifa</div>
                  {[
                    { label: 'Ocupación actual', val: recHoy.factores.ocupacion, desc: `${data?.ocupacionActual}%` },
                    { label: 'Fin de semana', val: recHoy.factores.finDeSemana, desc: recHoy.factores.finDeSemana > 0 ? 'Hoy es finde' : 'Día laboral' },
                    { label: 'Eventos', val: recHoy.factores.factorEvento, desc: recHoy.factores.eventos.length > 0 ? recHoy.factores.eventos.join(', ') : 'Sin eventos' },
                    { label: 'Competencia', val: recHoy.factores.competencia, desc: 'vs media mercado' },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem' }}>{f.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{f.desc}</div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: f.val > 0 ? '#27ae60' : f.val < 0 ? '#e74c3c' : 'var(--color-text-light)' }}>
                        {f.val > 0 ? '+' : ''}{f.val}%
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>💡 Paridad — mismo precio, más valor según canal</div>
                  {Object.entries(recHoy.tarifasCanal).map(([key, canal], i) => (
                    <div key={key} style={{ padding: '0.75rem 0', borderBottom: i < Object.keys(recHoy.tarifasCanal).length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{canal.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                            {canal.beneficios.map((b, j) => (
                              <span key={j} style={{ fontSize: '0.62rem', background: 'var(--color-bg)', color: 'var(--color-text-light)', padding: '0.1rem 0.4rem', borderRadius: 10 }}>{b}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
                          {fmtCOP(canal.precio)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>📅 Próximos 7 días — {hab.nombre}</div>
                  {(data?.recomendaciones?.[habSeleccionada] || []).map((dia, i) => {
                    const d = new Date(dia.fecha + 'T12:00:00')
                    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ width: 60 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{dias[d.getDay()]}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{d.getDate()}/{d.getMonth() + 1}</div>
                        </div>
                        <div style={{ flex: 1, margin: '0 0.75rem' }}>
                          {dia.factores.eventos.length > 0 && (
                            <div style={{ fontSize: '0.65rem', color: '#e67e22' }}>📅 {dia.factores.eventos[0]}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: dia.accionColor }}>{fmt(dia.barRecomendado)}</div>
                          <div style={{ fontSize: '0.62rem', color: dia.accionColor }}>{dia.diferencia > 0 ? '+' : ''}{dia.diferencia}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* COMPETENCIA */}
        {tab === 'competencia' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>📊 WELLcomm vs Competencia</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                Última actualización: {data?.ultimaActualizacion
                  ? new Date(data.ultimaActualizacion).toLocaleDateString('es-CO')
                  : 'Usando precios base investigados'}
              </div>

              {[
                { nombre: '⭐ WELLcomm', precio: 480000, esNosotros: true },
                ...COMPETENCIA_LISTA
                  .filter(h => preciosComp[h]?.precio > 0)
                  .map(h => ({ nombre: h.replace(' Hotel', '').replace(' Boutique', ''), precio: preciosComp[h].precio, esManual: preciosComp[h].esManual }))
                  .sort((a, b) => b.precio - a.precio)
              ].map((hotel, i) => {
                const maxP = Math.max(480000, ...COMPETENCIA_LISTA.map(h => preciosComp[h]?.precio || 0))
                const pct = Math.round((hotel.precio / maxP) * 100)
                return (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: hotel.esNosotros ? 700 : 400, color: hotel.esNosotros ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {hotel.nombre} {hotel.esManual ? '✏️' : ''}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fmt(hotel.precio)}</span>
                    </div>
                    <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: hotel.esNosotros ? 'var(--color-primary)' : '#cbd5e1', height: 6, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>✏️ Actualizar precios</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                Introduce los precios que ves en Booking.com hoy. El ✏️ indica precio actualizado manualmente.
              </div>

              {COMPETENCIA_LISTA.map((hotel, i) => (
                <div key={i} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>{hotel}</div>
                    {preciosComp[hotel]?.notas && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>{preciosComp[hotel].notas}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <span style={{ padding: '0.5rem 0.6rem', fontSize: '0.72rem', color: 'var(--color-text-light)', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg)', whiteSpace: 'nowrap' }}>COP</span>
                    <input
                      type="number"
                      value={preciosComp[hotel]?.precio || ''}
                      onChange={e => setPreciosComp(prev => ({ ...prev, [hotel]: { ...prev[hotel], precio: Number(e.target.value), esManual: true, actualizado: new Date().toISOString() } }))}
                      placeholder={`Base: ${(data?.competencia?.[hotel]?.precio_base || 0).toLocaleString('es-CO')}`}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              ))}

              <button onClick={guardarCompetencia} disabled={savingComp} style={{
                width: '100%', background: savedComp ? 'var(--color-primary)' : 'var(--color-text)',
                color: 'white', border: 'none', borderRadius: 10, padding: '0.875rem',
                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem'
              }}>
                {savingComp ? 'Guardando...' : savedComp ? '✅ Guardado' : 'Guardar precios competencia'}
              </button>
            </div>
          </>
        )}

        {/* EVENTOS */}
        {tab === 'eventos' && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📅 Calendario de Demanda — Medellín 2026</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>Eventos que impactan la demanda hotelera</div>
            {[
              { nombre: 'Semana Santa', fechas: '29 Mar – 5 Abr', factor: 30, tipo: 'alto', accion: 'Activar BAR máximo. Mínimo 2 noches. Cerrar No Reembolsable.' },
              { nombre: 'Día de la Madre', fechas: '10–11 May', factor: 20, tipo: 'medio', accion: 'Subir 15–20% en finde. Activar paquetes románticos.' },
              { nombre: 'Festival Tango', fechas: '5–15 Jun', factor: 15, tipo: 'medio', accion: 'Subir 12% durante el evento. Apertura anticipada.' },
              { nombre: 'Colombiamoda', fechas: '22–24 Jul', factor: 25, tipo: 'alto', accion: 'BAR máximo. Mínimo 2 noches. Corporate disponible.' },
              { nombre: 'Feria de las Flores', fechas: '1–10 Ago', factor: 35, tipo: 'mega', accion: '🚨 BAR máximo TODOS. Mínimo 3 noches. Cerrar descuentos.' },
              { nombre: 'Festival Jazz', fechas: '25–30 Sep', factor: 20, tipo: 'alto', accion: 'BAR máximo finde. Paquetes culturales.' },
              { nombre: 'Navidad Medellín', fechas: '1–31 Dic', factor: 40, tipo: 'mega', accion: '🚨 Temporada alta. Estrategia de yield completa.' },
              { nombre: 'Año Nuevo', fechas: '30 Dic – 2 Ene', factor: 50, tipo: 'mega', accion: '🚨 Precio máximo absoluto. Mínimo 3 noches. Sin descuentos.' },
            ].map((ev, i) => {
              const colorTipo = ev.tipo === 'mega' ? '#e74c3c' : ev.tipo === 'alto' ? '#e67e22' : '#f39c12'
              return (
                <div key={i} style={{ padding: '0.875rem 0', borderBottom: i < 7 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ev.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{ev.fechas}</div>
                    </div>
                    <div style={{ background: colorTipo, color: 'white', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                      +{ev.factor}% demanda
                    </div>
                  </div>
                  <div style={{ background: `${colorTipo}12`, borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: colorTipo, borderLeft: `3px solid ${colorTipo}` }}>
                    💡 {ev.accion}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PRESUPUESTO vs REAL (habitaciones) */}
        {tab === 'presupuesto' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Presupuesto vs Real · Habitaciones</div>
              <input type="month" value={pptoMes} onChange={e => setPptoMes(e.target.value)}
                style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
            </div>

            {!pptoLoading && pptoData?.cumplimiento && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => exportarPDFPresupuesto(pptoData, pptoMes)} style={{ flex: 1, background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar PDF</button>
                <button onClick={() => exportarExcelPresupuesto(pptoData, pptoMes)} style={{ flex: 1, background: 'white', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar Excel</button>
              </div>
            )}

            {pptoLoading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>Calculando real desde Cloudbeds...</div>
            )}

            {!pptoLoading && pptoData?.cumplimiento && (
              <>
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    CUMPLIMIENTO · {pptoData.cumplimiento.mes.toUpperCase()} 2026
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 300, color: colorCumplimiento(pptoData.cumplimiento.cumplimientoVentas) }}>
                      {pptoData.cumplimiento.cumplimientoVentas}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>del presupuesto en ventas</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: pptoData.cumplimiento.difVentas >= 0 ? 'var(--color-primary)' : '#e74c3c' }}>
                    {pptoData.cumplimiento.difVentas >= 0 ? '▲' : '▼'} {fmtCOP(Math.abs(pptoData.cumplimiento.difVentas))} {pptoData.cumplimiento.difVentas >= 0 ? 'sobre' : 'bajo'} lo presupuestado
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--color-text-light)', fontWeight: 600, paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-border)' }}>
                    <div>Métrica</div>
                    <div style={{ textAlign: 'right' }}>Presupuesto</div>
                    <div style={{ textAlign: 'right' }}>Real</div>
                    <div style={{ textAlign: 'right' }}>%</div>
                  </div>
                  {[
                    { label: 'Ventas alojamiento', ppto: fmtCOP(pptoData.cumplimiento.ppto.ventas), real: fmtCOP(pptoData.cumplimiento.real.ventas), pct: pptoData.cumplimiento.cumplimientoVentas },
                    { label: 'Habitaciones-noche', ppto: pptoData.cumplimiento.ppto.habVendidas, real: pptoData.cumplimiento.real.habVendidas, pct: pptoData.cumplimiento.cumplimientoHab },
                    { label: 'Tarifa media (ADR)', ppto: fmtCOP(pptoData.cumplimiento.ppto.tarifa), real: fmtCOP(pptoData.cumplimiento.real.tarifa), pct: pptoData.cumplimiento.cumplimientoTarifa },
                    { label: 'Ocupación', ppto: fmtPct(pptoData.cumplimiento.ppto.ocupacion), real: fmtPct(pptoData.cumplimiento.real.ocupacion), pct: pptoData.cumplimiento.ppto.ocupacion > 0 ? Math.round((pptoData.cumplimiento.real.ocupacion / pptoData.cumplimiento.ppto.ocupacion) * 100) : 0 },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: '0.5rem', fontSize: '0.78rem', padding: '0.6rem 0', borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none', alignItems: 'center' }}>
                      <div style={{ fontWeight: 500 }}>{row.label}</div>
                      <div style={{ textAlign: 'right', color: 'var(--color-text-light)' }}>{row.ppto}</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>{row.real}</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: colorCumplimiento(row.pct) }}>{row.pct}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
                  El "real" se calcula en vivo desde Cloudbeds noche por noche. Puede tardar unos segundos.
                </div>
              </>
            )}

            {!pptoLoading && pptoData?.meses?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Presupuesto anual 2026</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                  Total año: {fmtCOP(pptoData.totalPptoAnio)} · toca un mes para ver su detalle
                </div>
                {pptoData.meses.map((m, i) => {
                  const maxVentas = Math.max(...pptoData.meses.map(x => x.pptoVentas))
                  const pct = maxVentas > 0 ? Math.round((m.pptoVentas / maxVentas) * 100) : 0
                  const mesStr = `2026-${String(m.mesNumero).padStart(2, '0')}`
                  return (
                    <div key={i} onClick={() => setPptoMes(mesStr)} style={{ marginBottom: '0.6rem', cursor: 'pointer', opacity: m.esMesActual ? 1 : 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: m.esMesActual ? 700 : 400, color: m.esMesActual ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {MESES_CORTO[m.mesNumero]} {m.esMesActual ? '←' : ''}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{fmt(m.pptoVentas)} · {fmtPct(m.pptoOcupacion)}</span>
                      </div>
                      <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${pct}%`, background: m.esMesActual ? 'var(--color-primary)' : '#cbd5e1', height: 6, borderRadius: 4 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!pptoLoading && !pptoData?.cumplimiento && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow)', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>
                No hay presupuesto cargado para este mes. Verifica que la base de Notion esté conectada a la integración WELLcomm App.
              </div>
            )}
          </>
        )}

        {/* PPTO 360 — 3 líneas */}
        {tab === 'ppto360' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Ppto 360 · Líneas de negocio</div>
              <input type="month" value={p360Mes} onChange={e => setP360Mes(e.target.value)}
                style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
            </div>

            {p360Loading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>Calculando ingresos del mes...</div>
            )}

            {!p360Loading && p360Data && (
              <>
                {/* Tarjeta total consolidado */}
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    INGRESOS TOTALES · {(p360Data.mes || '').toUpperCase()} 2026
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 300, color: colorCumplimiento(p360Data.cumplimientoTotal) }}>
                      {p360Data.cumplimientoTotal}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>del presupuesto consolidado</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#aaa' }}>Real: <strong style={{ color: 'white' }}>{fmtCOP(p360Data.totalReal)}</strong></span>
                    <span style={{ color: '#aaa' }}>Ppto: <strong style={{ color: 'white' }}>{fmtCOP(p360Data.totalPpto)}</strong></span>
                  </div>
                </div>

                {/* Tarjetas por línea */}
                {p360Data.lineas?.map((l, i) => {
                  const dif = l.real - l.ppto
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)', borderLeft: `4px solid ${colorCumplimiento(l.cumplimiento)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{l.label}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>{l.fuente}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: colorCumplimiento(l.cumplimiento) }}>
                          {l.cumplimiento}%
                        </div>
                      </div>
                      <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 8, marginBottom: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(l.cumplimiento, 100)}%`, background: colorCumplimiento(l.cumplimiento), height: 8, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.72rem' }}>
                        <div>
                          <div style={{ color: 'var(--color-text-light)' }}>Presupuesto</div>
                          <div style={{ fontWeight: 600 }}>{fmt(l.ppto)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-light)' }}>Real</div>
                          <div style={{ fontWeight: 600 }}>{fmt(l.real)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--color-text-light)' }}>Diferencia</div>
                          <div style={{ fontWeight: 700, color: dif >= 0 ? '#27ae60' : '#e74c3c' }}>{dif >= 0 ? '+' : '−'}{fmt(Math.abs(dif))}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Resumen anual consolidado */}
                {p360Data.anual?.length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Presupuesto anual consolidado 2026</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                      Total año: {fmtCOP(p360Data.totalesAnio?.total)} · Hab {fmt(p360Data.totalesAnio?.habitaciones)} · A&B {fmt(p360Data.totalesAnio?.ab)} · Spa {fmt(p360Data.totalesAnio?.spa)}
                    </div>
                    {p360Data.anual.map((m, i) => {
                      const maxTotal = Math.max(...p360Data.anual.map(x => x.total))
                      const wH = maxTotal > 0 ? (m.habitaciones / maxTotal) * 100 : 0
                      const wA = maxTotal > 0 ? (m.ab / maxTotal) * 100 : 0
                      const wS = maxTotal > 0 ? (m.spa / maxTotal) * 100 : 0
                      const mesStr = `2026-${String(m.mesNumero).padStart(2, '0')}`
                      return (
                        <div key={i} onClick={() => setP360Mes(mesStr)} style={{ marginBottom: '0.6rem', cursor: 'pointer', opacity: m.esMesActual ? 1 : 0.9 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: m.esMesActual ? 700 : 400, color: m.esMesActual ? 'var(--color-primary)' : 'var(--color-text)' }}>
                              {MESES_CORTO[m.mesNumero]} {m.esMesActual ? '←' : ''}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{fmt(m.total)}</span>
                          </div>
                          <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${wH}%`, background: '#3498db', height: 8 }} title="Habitaciones" />
                            <div style={{ width: `${wA}%`, background: '#e67e22', height: 8 }} title="A&B" />
                            <div style={{ width: `${wS}%`, background: '#9b59b6', height: 8 }} title="Spa" />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--color-text-light)' }}>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#3498db', borderRadius: 2, marginRight: 4 }} />Habitaciones</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#e67e22', borderRadius: 2, marginRight: 4 }} />A&B</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#9b59b6', borderRadius: 2, marginRight: 4 }} />Spa</span>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
                  Habitaciones en vivo desde Cloudbeds · A&B y Spa desde los ingresos manuales del Portal del Propietario.
                </div>
              </>
            )}

            {!p360Loading && p360Data && p360Data.totalPpto === 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow)', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>
                No hay presupuesto cargado. Verifica que las bases de A&B y Spa en Notion estén conectadas a la integración WELLcomm App.
              </div>
            )}
          </>
        )}

        {/* GASTOS */}
        {tab === 'gastos' && (
          <>
            {/* Selector de periodo */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
              {GASTOS_PERIODOS.map(p => (
                <button key={p.id} onClick={() => setGastosPeriodo(p.id)} style={{
                  background: gastosPeriodo === p.id ? 'var(--color-text)' : 'white',
                  color: gastosPeriodo === p.id ? 'white' : 'var(--color-text)',
                  border: `1px solid ${gastosPeriodo === p.id ? 'var(--color-text)' : 'var(--color-border)'}`,
                  borderRadius: 20, padding: '0.4rem 0.9rem', fontSize: '0.74rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontWeight: gastosPeriodo === p.id ? 600 : 400
                }}>{p.label}</button>
              ))}
            </div>

            {/* Total del periodo */}
            <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                GASTOS TOTALES · {gastosPeriodo === 'acum' ? 'ENE–MAY 2026' : `${gastosPeriodo.toUpperCase()} 2026`}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300 }}>{fmtGasto(gTotalGen)}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.25rem' }}>
                {GASTOS.length} rubros contables · cierre real Siigo
              </div>
            </div>

            {/* Composición por bloque */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Composición del gasto</div>
              {gBloques.map(b => {
                const pct = Math.round((Math.abs(b.val) / Math.abs(gTotalGen || 1)) * 100)
                const w = Math.round((Math.abs(b.val) / gMaxAbs) * 100)
                return (
                  <div key={b.id} style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 500 }}>{b.nombre}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: b.val > 0 ? '#27ae60' : 'var(--color-text)' }}>{fmtGasto(b.val)} · {pct}%</span>
                    </div>
                    <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 7 }}>
                      <div style={{ width: `${w}%`, background: b.val > 0 ? '#27ae60' : 'var(--color-primary)', height: 7, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detalle por rubro (apartados Siigo) */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Detalle por rubro</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Toca un apartado para ver sus cuentas</div>
              {SECCIONES_GASTOS.map(s => {
                const abierto = gastosOpen === s.id
                const cuentas = gastosDeSeccion(s.id)
                const v = gValSeccion(s.id)
                return (
                  <div key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div onClick={() => setGastosOpen(abierto ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', display: 'inline-block', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{s.nombre}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>({cuentas.length})</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: v > 0 ? '#27ae60' : 'var(--color-text)' }}>{fmtGasto(v)}</span>
                    </div>
                    {abierto && (
                      <div style={{ paddingBottom: '0.5rem' }}>
                        {cuentas.map(c => {
                          const cv = gValCuenta(c)
                          return (
                            <div key={c.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0 0.35rem 1.4rem', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                                <span style={{ color: '#c4c4c4', marginRight: '0.4rem' }}>{c.codigo}</span>{c.nombre}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 500, flexShrink: 0, color: cv > 0 ? '#27ae60' : cv < 0 ? 'var(--color-text)' : '#ccc' }}>{cv === 0 ? '—' : fmtGasto(cv)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
              Cierre real Siigo Ene–May 2026 · cuadra peso por peso con el informe contable. {CUENTAS_SIN_MOVIMIENTO.length} cuentas adicionales sin movimiento en el periodo.
            </div>
          </>
        )}

        {/* COPILOT */}
        {tab === 'copilot' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
              {copilotMsgs.length === 1 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>PREGUNTAS FRECUENTES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      '¿Cuál debería ser mi tarifa este fin de semana?',
                      '¿Voy bien respecto al presupuesto del mes?',
                      '¿Cuándo activar el BAR máximo?',
                      '¿Cómo mejorar el RevPAR este mes?',
                      'Analiza mi posición vs la competencia',
                      '¿Qué estrategia para la Feria de las Flores?',
                    ].map((q, i) => (
                      <button key={i} onClick={() => setCopilotInput(q)} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text)', cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {copilotMsgs.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, background: 'var(--color-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', marginRight: '0.5rem', flexShrink: 0, marginTop: 2 }}>📊</div>
                  )}
                  <div style={{ maxWidth: '82%', background: msg.role === 'user' ? 'var(--color-text)' : 'white', color: msg.role === 'user' ? 'white' : 'var(--color-text)', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.75rem 1rem', fontSize: '0.85rem', lineHeight: 1.6, boxShadow: 'var(--shadow)', whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {copilotLoading && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, background: 'var(--color-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊</div>
                  <div style={{ background: 'white', borderRadius: '16px 16px 16px 4px', padding: '0.75rem 1rem', boxShadow: 'var(--shadow)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: `bounce 1s ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ background: 'white', borderTop: '1px solid var(--color-border)', padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <input
                value={copilotInput}
                onChange={e => setCopilotInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarCopilot()}
                placeholder="Pregunta al Revenue Manager IA..."
                style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '24px', padding: '0.75rem 1.25rem', fontSize: '0.85rem', outline: 'none', background: 'var(--color-bg)' }}
              />
              <button onClick={enviarCopilot} disabled={copilotLoading || !copilotInput.trim()} style={{ background: copilotInput.trim() ? 'var(--color-text)' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>→</button>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
    </div>
  )
}
