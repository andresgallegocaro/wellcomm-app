import { useState, useEffect } from 'react'

const C = {
  bg: '#E8F0EC', dark: '#1A1A1A', primary: '#7EC8A0', primaryDark: '#5aaa80',
  text: '#1A1A1A', muted: '#7a8c82', light: '#d0ddd5', white: '#FFFFFF',
  coral: '#E0654F', gold: '#C5A45E',
}

function fmt(n) {
  if (!n) return '$0'
  const a = Math.abs(n)
  if (a >= 1000000) return `${n < 0 ? '-' : ''}$${(a / 1000000).toFixed(1)}M`
  if (a >= 1000) return `${n < 0 ? '-' : ''}$${Math.round(a / 1000)}K`
  return `$${n}`
}
function fmtCOP(n) {
  const x = Number(n || 0)
  return `${x < 0 ? '- ' : ''}COP ${Math.abs(x).toLocaleString('es-CO')}`
}
function pct(real, ppto) {
  if (!ppto) return null
  return Math.round((real / ppto) * 100)
}

const COLOR_CAT = {
  'F&B': '#e67e22', 'Spa': '#9b59b6', 'Habitaciones': '#3498db',
  'Mantenimiento': '#e74c3c', 'Legal': '#34495e', 'Servicios': '#16a085',
  'Nómina': '#f39c12', 'Marketing': '#e91e63', 'Otros': '#95a5a6'
}

const SECCIONES = [
  { id: 'resumen', icon: '📊', label: 'Resumen' },
  { id: 'liquidacion', icon: '💸', label: 'Liquidación' },
  { id: 'recibos', icon: '🧾', label: 'Recibos' },
]

function RecibosSection({ data, mes, onReload }) {
  const [leyendo, setLeyendo] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [lote, setLote] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState(null)

  const categorias = data.categorias || []
  const recibos = data.recibos || []
  const porCat = data.gastosPorCategoria || {}

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function leerUno(file) {
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leer_recibo', pdfBase64: base64 })
      })
      const d = await res.json()
      if (d.ok && d.datos) return { nombre: file.name, ...d.datos }
      return { nombre: file.name, proveedor: '', importe: 0, fecha: '', concepto: 'No se pudo leer', categoria: 'Otros', proveedorConocido: false }
    } catch {
      return { nombre: file.name, proveedor: '', importe: 0, fecha: '', concepto: 'Error al leer', categoria: 'Otros', proveedorConocido: false }
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf')
    if (files.length === 0) { setErrorMsg('Selecciona uno o más archivos PDF'); return }
    if (files.length > 40) { setErrorMsg('Máximo 40 recibos a la vez'); return }

    setErrorMsg(''); setLeyendo(true); setLote(null)

    const resultados = []
    for (let i = 0; i < files.length; i++) {
      setProgreso(`Leyendo ${i + 1} de ${files.length}...`)
      const r = await leerUno(files[i])
      resultados.push({ ...r, incluir: true })
      setLote([...resultados])
    }

    setLeyendo(false); setProgreso('')
  }

  function actualizarFila(idx, campo, valor) {
    setLote(prev => prev.map((r, i) => i === idx ? { ...r, [campo]: valor } : r))
  }

  async function guardarTodos() {
    const aGuardar = lote.filter(r => r.incluir).map(r => ({
      proveedor: r.proveedor, importe: Number(r.importe) || 0,
      fecha: r.fecha, concepto: r.concepto, categoria: r.categoria,
      proveedorConocido: r.proveedorConocido
    }))
    if (aGuardar.length === 0) { setErrorMsg('No hay recibos marcados para guardar'); return }

    setGuardando(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar_lote', mes, recibos: aGuardar })
      })
      setLote(null)
      await onReload()
    } finally {
      setGuardando(false)
    }
  }

  function abrirEdicion(r) {
    setEditId(r.id)
    setEditData({ proveedor: r.proveedor, importe: r.importe, fecha: r.fecha, concepto: r.concepto, categoria: r.categoria })
  }

  async function guardarEdicion() {
    setGuardando(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'editar_recibo', mes, id: editId, cambios: editData })
      })
      setEditId(null); setEditData(null)
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

  const totalLote = lote ? lote.filter(r => r.incluir).reduce((s, r) => s + (Number(r.importe) || 0), 0) : 0
  const countLote = lote ? lote.filter(r => r.incluir).length : 0

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Recibos y Gastos</div>
      <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Sube uno o varios PDF de pagos y la IA los lee y clasifica</div>

      {!lote && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${C.light}`, borderRadius: 12, padding: '2rem 1rem',
            cursor: leyendo ? 'default' : 'pointer', background: C.bg
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: C.dark }}>
              {leyendo ? (progreso || 'Leyendo con IA...') : 'Subir recibos PDF'}
            </div>
            <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>
              {leyendo ? 'Esto puede tardar un poco' : 'Selecciona uno o varios archivos a la vez'}
            </div>
            <input type="file" accept="application/pdf" multiple disabled={leyendo}
              onChange={e => handleFiles(e.target.files)}
              style={{ display: 'none' }} />
          </label>
          {errorMsg && <div style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>{errorMsg}</div>}
        </div>
      )}

      {lote && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `2px solid ${C.primary}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: C.primaryDark }}>
              {leyendo ? (progreso || 'Leyendo...') : `✓ Revisa y corrige (${lote.length})`}
            </div>
            {!leyendo && <button onClick={() => { setLote(null); setErrorMsg('') }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.72rem', cursor: 'pointer' }}>Cancelar todo</button>}
          </div>

          {lote.map((r, idx) => (
            <div key={idx} style={{
              border: `1px solid ${r.incluir ? C.light : '#eee'}`, borderRadius: 10, padding: '0.85rem',
              marginBottom: '0.75rem', background: r.incluir ? C.white : '#f7f7f7', opacity: r.incluir ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={r.incluir} onChange={e => actualizarFila(idx, 'incluir', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.62rem', color: C.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {r.nombre}</span>
                </div>
                {r.proveedorConocido && <span style={{ fontSize: '0.58rem', background: `${C.primary}33`, color: C.primaryDark, padding: '0.1rem 0.45rem', borderRadius: 8 }}>✓ conocido</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Proveedor</label>
                  <input value={r.proveedor || ''} onChange={e => actualizarFila(idx, 'proveedor', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Importe (COP)</label>
                  <input type="number" value={r.importe || ''} onChange={e => actualizarFila(idx, 'importe', Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Fecha</label>
                  <input type="date" value={r.fecha || ''} onChange={e => actualizarFila(idx, 'fecha', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Categoría</label>
                  <select value={r.categoria} onChange={e => actualizarFila(idx, 'categoria', e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', background: C.white, outline: 'none', boxSizing: 'border-box' }}>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Concepto</label>
                <input value={r.concepto || ''} onChange={e => actualizarFila(idx, 'concepto', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          ))}

          {!leyendo && (
            <>
              <div style={{ borderTop: `2px solid ${C.dark}`, paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>Total a sumar ({countLote})</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(totalLote)}</span>
              </div>

              {errorMsg && <div style={{ color: '#e74c3c', fontSize: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>{errorMsg}</div>}

              <button onClick={guardarTodos} disabled={guardando} style={{
                width: '100%', background: C.dark, color: 'white', border: 'none', borderRadius: 10,
                padding: '0.85rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)'
              }}>
                {guardando ? 'Guardando...' : `✓ Confirmar y sumar ${countLote} recibo${countLote !== 1 ? 's' : ''} al mes`}
              </button>
            </>
          )}
        </div>
      )}

      {data.totalRecibos > 0 && !lote && (
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

      {recibos.length > 0 && !lote && (
        <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Recibos del mes ({recibos.length})</div>
          {recibos.map((r, i) => (
            editId === r.id ? (
              <div key={r.id} style={{ border: `2px solid ${C.primary}`, borderRadius: 10, padding: '0.85rem', marginBottom: '0.75rem', background: C.white }}>
                <div style={{ fontSize: '0.7rem', color: C.primaryDark, fontWeight: 600, marginBottom: '0.6rem' }}>Editando recibo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Proveedor</label>
                    <input value={editData.proveedor || ''} onChange={e => setEditData({ ...editData, proveedor: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Importe (COP)</label>
                    <input type="number" value={editData.importe || ''} onChange={e => setEditData({ ...editData, importe: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Fecha</label>
                    <input type="date" value={editData.fecha || ''} onChange={e => setEditData({ ...editData, fecha: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Categoría</label>
                    <select value={editData.categoria} onChange={e => setEditData({ ...editData, categoria: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', background: C.white, outline: 'none', boxSizing: 'border-box' }}>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.62rem', color: C.muted, display: 'block', marginBottom: '0.15rem' }}>Concepto</label>
                  <input value={editData.concepto || ''} onChange={e => setEditData({ ...editData, concepto: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem 0.55rem', border: `1px solid ${C.light}`, borderRadius: 7, fontSize: '0.8rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button onClick={() => { setEditId(null); setEditData(null) }} style={{ flex: 1, background: C.bg, color: C.muted, border: `1px solid ${C.light}`, borderRadius: 8, padding: '0.6rem', fontSize: '0.78rem', cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={guardarEdicion} disabled={guardando} style={{ flex: 2, background: C.dark, color: 'white', border: 'none', borderRadius: 8, padding: '0.6rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    {guardando ? 'Guardando...' : '✓ Guardar cambios'}
                  </button>
                </div>
              </div>
            ) : (
              <div key={r.id} style={{ padding: '0.6rem 0', borderBottom: i < recibos.length - 1 ? `1px solid ${C.light}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r.proveedor || 'Sin nombre'}</div>
                  <div style={{ fontSize: '0.68rem', color: C.muted }}>{r.fecha} · {r.concepto}</div>
                  <span style={{ fontSize: '0.62rem', background: `${COLOR_CAT[r.categoria]}22`, color: COLOR_CAT[r.categoria], padding: '0.1rem 0.5rem', borderRadius: 10, display: 'inline-block', marginTop: '0.25rem' }}>{r.categoria}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(r.importe)}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <button onClick={() => abrirEdicion(r)} style={{ background: 'none', border: 'none', color: C.primaryDark, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }}>Editar</button>
                    <button onClick={() => eliminar(r.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.65rem', cursor: 'pointer' }}>Eliminar</button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export default function OwnerPortal({ onBack, onRevenue }) {
  const [seccion, setSeccion] = useState('resumen')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => { cargarDatos() }, [mes])

  async function cargarDatos() {
    setLoading(true)
    try {
      const res = await fetch(`/api/propietario?mes=${mes}`)
      setData(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const r = data?.resumen || {}
  const cb = data?.cloudbeds || {}
  const p = data?.pnl || null
  const cierre = !!data?.tieneCierre

  // ===== Filas de la liquidación USALI (estructura del board) =====
  function buildLiq() {
    if (!p) return []
    const rows = []
    const L = (label, node, type = 'line', indent = true) =>
      rows.push({ label, ppto: node?.ppto || 0, real: node?.real || 0, type, indent })

    // Ingresos
    rows.push({ label: 'INGRESOS OPERATIVOS', type: 'header' })
    L('Habitaciones', p.ingresos.habitaciones)
    L('A&B · The Terrace', p.ingresos.ab)
    L('AKEN Spa', p.ingresos.spa)
    L('Otros (Minibar)', p.ingresos.otros)
    L('─── Ingreso total', p.ingresos.total, 'subtotal', false)

    // Utilidad departamental
    rows.push({ label: 'UTILIDAD DEPARTAMENTAL', type: 'header' })
    L('Habitaciones', p.utilidad.habitaciones)
    L('A&B · The Terrace', p.utilidad.ab)
    L('AKEN Spa', p.utilidad.spa)
    L('Otros departamentos', p.utilidad.otros)
    L('Arrendamientos y recobros', p.utilidad.arrendamientos)
    L('─── Utilidad departamental', p.utilidad.departamental, 'subtotal', false)

    // Gastos no distribuidos
    rows.push({ label: 'GASTOS NO DISTRIBUIDOS', type: 'header' })
    L('Administración y generales', p.noDistribuidos.admon)
    if (p.feeSolara?.aplicado) rows.push({ label: '↳ Asesoría · Fee gestión SOLARA', ppto: p.feeSolara.total, real: 0, type: 'note', indent: true })
    L('Mercadeo y ventas', p.noDistribuidos.mercadeo)
    L('Mantenimiento y fuerza', p.noDistribuidos.mantenimiento)
    L('─── Total no distribuidos', p.noDistribuidos.total, 'subtotal', false)

    // GOP
    L('═══ GOP (Gross Operating Profit)', p.gop, 'gop', false)

    // Operador
    rows.push({ label: 'OPERADOR', type: 'header' })
    L('Utilidad bruta operador (10%)', p.operador.bruta)
    L('Fee de marca', p.operador.feeMarca)
    L('─── Utilidad total operador', p.operador.total, 'subtotal', false)

    // Inversionistas
    L('═══ Utilidad inversionistas', p.inversionistas.total, 'gop', false)
    L('FARA', p.inversionistas.fara)
    L('Predial', p.inversionistas.predial)
    L('Fiducia', p.inversionistas.fiducia)
    L('Póliza de seguros', p.inversionistas.poliza)
    L('═══ UTILIDAD A DISTRIBUIR', p.inversionistas.distribuir, 'final', false)

    return rows
  }
  const liq = buildLiq()

  // Líneas de "gasto" (utilidad/no distribuidos restan, se muestran en negativo en la columna)
  const esResta = (label) =>
    /^(Administración|Mercadeo|Mantenimiento|─── Total no distribuidos|Utilidad bruta operador|Fee de marca|─── Utilidad total operador|FARA|Predial|Fiducia|Póliza)/.test(label)

  function valColor(row) {
    if (row.type === 'final') return (cierre ? row.real : row.ppto) >= 0 ? C.primary : C.coral
    if (row.type === 'gop') return (cierre ? row.real : row.ppto) >= 0 ? C.primary : C.coral
    if (row.type === 'subtotal') return '#ddd'
    return '#aaa'
  }

  const ingTot = p ? (cierre ? p.ingresos.total.real : p.ingresos.total.ppto) : 0
  const gopVal = p ? (cierre ? p.gop.real : p.gop.ppto) : 0
  const distVal = p ? (cierre ? p.inversionistas.distribuir.real : p.inversionistas.distribuir.ppto) : 0
  const cumpIng = p ? pct(p.ingresos.total.real, p.ingresos.total.ppto) : null
  const cumpGop = p ? pct(p.gop.real, p.gop.ppto) : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: C.dark, padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: C.primary, fontSize: 16, letterSpacing: 3, fontWeight: 700, fontFamily: 'var(--font-display)' }}>WELLCOMM</span>
              <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2 }}>✳ PROPIETARIOS</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{mes} · {cierre ? 'Cierre oficial' : 'En curso'}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onRevenue && (
              <button onClick={onRevenue} style={{ background: C.primary, border: 'none', borderRadius: 8, color: C.dark, padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>📈 Revenue</button>
            )}
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              style={{ background: '#333', color: 'white', border: 'none', borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontFamily: 'var(--font-body)' }} />
            <button onClick={onBack} style={{ background: 'none', border: `1px solid #444`, borderRadius: 8, color: '#aaa', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.7rem' }}>← Inicio</button>
          </div>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', borderTop: `1px solid rgba(255,255,255,0.1)` }}>
          {SECCIONES.map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)} style={{
              flex: '0 0 auto', background: seccion === s.id ? C.primary : 'transparent',
              color: seccion === s.id ? C.dark : '#aaa', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              fontFamily: 'var(--font-body)', minWidth: 64,
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
            {/* ===== RESUMEN ===== */}
            {seccion === 'resumen' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Resumen Ejecutivo</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1rem' }}>{mes} · WELLcomm Spa & Hotel</div>

                <div style={{ display: 'inline-block', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.05em', padding: '0.25rem 0.7rem', borderRadius: 20, marginBottom: '1rem',
                  background: cierre ? `${C.primary}22` : `${C.gold}22`, color: cierre ? C.primaryDark : C.gold }}>
                  {cierre ? '✓ CIERRE OFICIAL DEL BOARD' : '◷ MES EN CURSO · COMPARADO VS PRESUPUESTO'}
                </div>

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
                    { icon: '💰', label: cierre ? 'INGRESO TOTAL (real)' : 'INGRESO TOTAL (ppto)', val: fmt(ingTot), sub: cumpIng != null && cierre ? `${cumpIng}% del presupuesto` : 'Hab + A&B + Spa', color: C.primary },
                    { icon: '📊', label: cierre ? 'GOP (real)' : 'GOP (ppto)', val: fmt(gopVal), sub: cumpGop != null && cierre ? `${cumpGop}% del presupuesto` : 'Gross Operating Profit', color: gopVal >= 0 ? C.primary : C.coral },
                    { icon: '🏛️', label: 'GASTOS TOTALES', val: fmt(r.totalGastos), sub: 'Hasta GOP', color: C.gold },
                    { icon: '✅', label: 'UTILIDAD INVERSIONISTAS', val: fmt(distVal), sub: 'A distribuir', color: distVal >= 0 ? C.primary : C.coral },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 12, padding: '1rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>{k.icon}</div>
                      <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{k.val}</div>
                      <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: '0.15rem' }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {p && (
                  <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}`, marginBottom: '1rem' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Ingresos por centro · {cierre ? 'real vs ppto' : 'presupuesto'}</div>
                    {[
                      { label: '🏨 Habitaciones', node: p.ingresos.habitaciones },
                      { label: '🍽️ A&B · The Terrace', node: p.ingresos.ab },
                      { label: '💆 AKEN Spa', node: p.ingresos.spa },
                    ].map((it, i) => {
                      const real = cierre ? it.node.real : it.node.ppto
                      const c = pct(it.node.real, it.node.ppto)
                      const base = Math.max(it.node.ppto, it.node.real, 1)
                      return (
                        <div key={i} style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem' }}>{it.label}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmt(real)}{cierre && c != null ? <span style={{ color: c >= 90 ? C.primaryDark : C.coral, fontSize: '0.66rem', marginLeft: 6 }}>{c}%</span> : null}</span>
                          </div>
                          <div style={{ background: C.light, borderRadius: 4, height: 6, position: 'relative' }}>
                            <div style={{ width: `${Math.min((it.node.ppto / base) * 100, 100)}%`, background: '#cdd6d1', height: 6, borderRadius: 4, position: 'absolute' }} />
                            <div style={{ width: `${Math.min(((cierre ? it.node.real : it.node.ppto) / base) * 100, 100)}%`, background: C.primary, height: 6, borderRadius: 4, position: 'absolute' }} />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: '0.5rem' }}>Barra clara = presupuesto · Barra verde = {cierre ? 'real' : 'presupuesto'}</div>
                  </div>
                )}

                <div style={{ background: C.dark, borderRadius: 12, padding: '1.1rem 1.25rem' }}>
                  <div style={{ color: C.gold, fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>✳ Fee de gestión SOLARA</div>
                  {r.feeSolaraTotal > 0 ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                        <span style={{ fontSize: '0.74rem', color: '#888' }}>Fijo mensual</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{fmtCOP(r.feeSolaraFijo)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                        <span style={{ fontSize: '0.74rem', color: '#888' }}>Variable (5% del GOP antes de fee)</span>
                        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{fmtCOP(r.feeSolaraVariable)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.76rem', color: '#bbb', fontWeight: 600 }}>Total fee SOLARA</span>
                        <span style={{ fontSize: '0.82rem', color: C.gold, fontWeight: 700 }}>{fmtCOP(r.feeSolaraTotal)}</span>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '0.5rem' }}>Imputado en Asesoría (Administración y Generales), antes del GOP. Ya restado en la cascada de este mes.</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: '#888' }}>El fee de gestión SOLARA inició en mayo 2026. En los cierres reales Ene–Abr aún no aplicaba.</div>
                  )}
                </div>
              </div>
            )}

            {/* ===== LIQUIDACIÓN (P&L USALI) ===== */}
            {seccion === 'liquidacion' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Liquidación · P&L Oficial</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1rem' }}>
                  {mes} · estructura del board {cierre ? '· cierre real vs presupuesto' : '· presupuesto (mes sin cierre)'}
                </div>

                {!p && <div style={{ color: C.muted }}>Sin datos de P&L para este mes.</div>}

                {p && (
                  <div style={{ background: C.dark, borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ color: C.primary, fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>✳ CUENTA DE RESULTADOS · {mes.toUpperCase()}</div>
                    </div>

                    {/* Cabecera de columnas */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0', padding: '0 0 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                      <span style={{ width: 92, textAlign: 'right', fontSize: '0.6rem', color: '#888', letterSpacing: '0.05em' }}>PRESUP.</span>
                      <span style={{ width: 92, textAlign: 'right', fontSize: '0.6rem', color: cierre ? C.primary : '#666', letterSpacing: '0.05em' }}>{cierre ? 'REAL' : 'EN CURSO'}</span>
                    </div>

                    {liq.map((row, i) => {
                      if (row.type === 'header') {
                        return (
                          <div key={i} style={{ padding: '0.7rem 0 0.3rem' }}>
                            <span style={{ fontSize: '0.62rem', color: C.gold, fontWeight: 700, letterSpacing: '0.08em' }}>{row.label}</span>
                          </div>
                        )
                      }
                      if (row.type === 'note') {
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.1rem 0 0.35rem', paddingLeft: 16 }}>
                            <span style={{ flex: 1, fontSize: '0.64rem', color: C.gold, fontStyle: 'italic' }}>{row.label}</span>
                            <span style={{ width: 92, textAlign: 'right', fontSize: '0.64rem', color: C.gold, fontStyle: 'italic' }}>incl. {fmt(row.ppto)}</span>
                            <span style={{ width: 92 }}></span>
                          </div>
                        )
                      }
                      const big = row.type === 'gop' || row.type === 'final'
                      const sub = row.type === 'subtotal'
                      const resta = esResta(row.label)
                      const realShown = cierre ? row.real : null
                      const fmtVal = (x, neg) => {
                        if (x == null) return '—'
                        const signed = neg && x !== 0 ? -Math.abs(x) : x
                        return fmtCOP(signed)
                      }
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', padding: big ? '0.6rem 0' : '0.32rem 0',
                          borderBottom: big || sub ? '1px solid rgba(255,255,255,0.13)' : '1px solid rgba(255,255,255,0.04)',
                          marginTop: big ? '0.4rem' : 0,
                          background: row.type === 'gop' ? 'rgba(126,200,160,0.06)' : row.type === 'final' ? 'rgba(126,200,160,0.10)' : 'transparent',
                          borderRadius: big ? 6 : 0, paddingLeft: big ? 8 : 0, paddingRight: big ? 8 : 0,
                        }}>
                          <span style={{ flex: 1, fontSize: big ? '0.8rem' : sub ? '0.74rem' : '0.72rem',
                            color: big ? C.white : sub ? '#ddd' : '#9aa',
                            fontWeight: big || sub ? 700 : 400, paddingLeft: row.indent && !big && !sub ? 8 : 0 }}>{row.label}</span>
                          <span style={{ width: 92, textAlign: 'right', fontSize: big ? '0.78rem' : '0.7rem',
                            color: sub || big ? '#cfd8d3' : '#7d8c84', fontWeight: big ? 700 : sub ? 600 : 400 }}>
                            {fmtVal(row.ppto, resta)}
                          </span>
                          <span style={{ width: 92, textAlign: 'right', fontSize: big ? '0.82rem' : '0.72rem',
                            color: big ? valColor(row) : sub ? '#fff' : '#cdd6d1', fontWeight: big || sub ? 700 : 500 }}>
                            {fmtVal(realShown, resta)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Cumplimiento */}
                {p && cierre && (
                  <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Cumplimiento vs presupuesto</div>
                    {[
                      { label: 'Ingreso total', real: p.ingresos.total.real, ppto: p.ingresos.total.ppto },
                      { label: 'Utilidad departamental', real: p.utilidad.departamental.real, ppto: p.utilidad.departamental.ppto },
                      { label: 'GOP', real: p.gop.real, ppto: p.gop.ppto },
                      { label: 'Utilidad a distribuir', real: p.inversionistas.distribuir.real, ppto: p.inversionistas.distribuir.ppto },
                    ].map((k, i) => {
                      const c = pct(k.real, k.ppto)
                      const col = c == null ? C.muted : c >= 90 ? C.primaryDark : c >= 60 ? C.gold : C.coral
                      return (
                        <div key={i} style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.78rem', color: C.muted }}>{k.label}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: col }}>{c == null ? '—' : `${c}%`}</span>
                          </div>
                          <div style={{ background: C.light, borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${Math.max(0, Math.min(Math.abs(c || 0), 100))}%`, background: col, height: 6, borderRadius: 4 }} />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: '0.25rem' }}>Fuente: P&L oficial del board (PPTO2026). Habitaciones del mes corriente se actualiza en vivo con Cloudbeds.</div>
                  </div>
                )}
              </div>
            )}

            {/* ===== RECIBOS ===== */}
            {seccion === 'recibos' && <RecibosSection data={data} mes={mes} onReload={cargarDatos} />}
          </>
        )}
      </div>
    </div>
  )
}
