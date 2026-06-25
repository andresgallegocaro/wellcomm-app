import { useState, useEffect } from 'react'
import { exportarExcelInforme, exportarPDFInforme } from './exportInforme'

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

function GastosEditor({ gastos, mes, onChange, onSaved }) {
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const cats = gastos.categorias || []
  const ing = gastos.ingresos || {}

  function setCats(newCats) { onChange({ ...gastos, categorias: newCats }) }
  function setIngreso(field, val) { onChange({ ...gastos, ingresos: { ...ing, [field]: val } }) }
  function toggle(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  function updLineaValor(ci, li, val) {
    setCats(cats.map((c, i) => i !== ci ? c : { ...c, lineas: c.lineas.map((l, j) => j !== li ? l : { ...l, valor: val }) }))
  }
  function updLineaLabel(ci, li, val) {
    setCats(cats.map((c, i) => i !== ci ? c : { ...c, lineas: c.lineas.map((l, j) => j !== li ? l : { ...l, label: val }) }))
  }
  function addLinea(ci) {
    setCats(cats.map((c, i) => i !== ci ? c : { ...c, lineas: [...(c.lineas || []), { id: `l${Date.now()}`, label: 'Nueva línea', valor: 0 }] }))
  }
  function delLinea(ci, li) {
    setCats(cats.map((c, i) => i !== ci ? c : { ...c, lineas: c.lineas.filter((_, j) => j !== li) }))
  }
  function updCatLabel(ci, val) {
    setCats(cats.map((c, i) => i !== ci ? c : { ...c, label: val }))
  }
  function delCat(ci) { setCats(cats.filter((_, i) => i !== ci)) }
  function addCat() { setCats([...cats, { id: `c${Date.now()}`, label: 'Nueva categoría', emoji: '📁', lineas: [] }]) }

  const catTotal = c => (c.lineas || []).reduce((a, l) => a + (Number(l.valor) || 0), 0)
  const totalGeneral = cats.reduce((a, c) => a + catTotal(c), 0)

  async function guardar() {
    setSaving(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guardar_gastos', mes, gastos })
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      if (onSaved) await onSaved()
    } finally { setSaving(false) }
  }

  async function restablecer() {
    if (!confirm(`¿Restablecer ${mes} a sus valores originales del balance? Se borrarán las ediciones manuales de este mes.`)) return
    setSaving(true)
    try {
      await fetch('/api/propietario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_gastos', mes })
      })
      if (onSaved) await onSaved()
    } finally { setSaving(false) }
  }

  const inputStyle = { width: '100%', padding: '0.55rem 0.65rem', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: '0.85rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      {/* Ingresos */}
      <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.light}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem', borderBottom: `1px solid ${C.light}`, paddingBottom: '0.5rem' }}>💰 Ingresos del mes</div>
        {[
          { label: 'Habitaciones (automático Cloudbeds)', field: 'habitaciones', ro: true },
          { label: 'Terraza / F&B (manual)', field: 'terraza' },
          { label: 'SPA (manual)', field: 'spa' },
          { label: 'Upselling y servicios extra', field: 'upselling' },
          { label: 'Otros ingresos', field: 'otrosIngresos' },
        ].map(it => (
          <div key={it.field} style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.7rem', color: C.muted, display: 'block', marginBottom: '0.25rem' }}>{it.label}</label>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.light}`, borderRadius: 8, background: it.ro ? '#f3f3f3' : C.white, overflow: 'hidden' }}>
              <span style={{ padding: '0.6rem 0.5rem', fontSize: '0.78rem', color: C.muted, borderRight: `1px solid ${C.light}` }}>COP</span>
              <input type="number" value={ing[it.field] || ''} readOnly={it.ro} disabled={it.ro}
                onChange={e => setIngreso(it.field, Number(e.target.value))}
                placeholder="0" style={{ flex: 1, padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem', fontFamily: 'var(--font-body)', background: 'transparent', color: it.ro ? C.muted : C.text }} />
            </div>
          </div>
        ))}
      </div>

      {/* Gastos expandibles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>📋 Gastos del mes</div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(totalGeneral)}</div>
      </div>

      {cats.map((cat, ci) => {
        const isOpen = expanded[cat.id]
        const subtotal = catTotal(cat)
        return (
          <div key={cat.id} style={{ background: C.white, borderRadius: 12, marginBottom: '0.6rem', border: `1px solid ${C.light}`, overflow: 'hidden' }}>
            <div onClick={() => toggle(cat.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', cursor: 'pointer', background: isOpen ? '#fafafa' : C.white }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: C.muted, display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cat.label}</span>
                <span style={{ fontSize: '0.62rem', color: C.muted }}>({(cat.lineas || []).length})</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e67e22' }}>{fmtCOP(subtotal)}</span>
            </div>

            {isOpen && (
              <div style={{ padding: '0.5rem 1rem 1rem', borderTop: `1px solid ${C.light}` }}>
                <div style={{ marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.6rem', color: C.muted, display: 'block', marginBottom: '0.2rem' }}>Nombre de la categoría</label>
                  <input value={cat.label} onChange={e => updCatLabel(ci, e.target.value)} style={inputStyle} />
                </div>
                {(cat.lineas || []).map((l, li) => (
                  <div key={l.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <input value={l.label} onChange={e => updLineaLabel(ci, li, e.target.value)} placeholder="Concepto"
                      style={{ ...inputStyle, flex: 1.4 }} />
                    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.light}`, borderRadius: 8, overflow: 'hidden', flex: 1 }}>
                      <span style={{ padding: '0.55rem 0.4rem', fontSize: '0.66rem', color: C.muted, borderRight: `1px solid ${C.light}` }}>COP</span>
                      <input type="number" value={l.valor || ''} onChange={e => updLineaValor(ci, li, Number(e.target.value))} placeholder="0"
                        style={{ width: '100%', padding: '0.55rem 0.5rem', border: 'none', outline: 'none', fontSize: '0.82rem', fontFamily: 'var(--font-body)' }} />
                    </div>
                    <button onClick={() => delLinea(ci, li)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '1rem', cursor: 'pointer', padding: '0 0.2rem' }}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
                  <button onClick={() => addLinea(ci)} style={{ background: C.bg, border: `1px solid ${C.light}`, color: C.primaryDark, borderRadius: 8, padding: '0.4rem 0.7rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>+ Agregar línea</button>
                  <button onClick={() => delCat(ci)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '0.68rem', cursor: 'pointer' }}>Eliminar categoría</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button onClick={addCat} style={{ width: '100%', background: C.white, border: `1px dashed ${C.light}`, color: C.muted, borderRadius: 10, padding: '0.7rem', fontSize: '0.78rem', cursor: 'pointer', marginBottom: '1rem', marginTop: '0.25rem' }}>+ Agregar categoría</button>

      <button onClick={guardar} disabled={saving} style={{
        width: '100%', background: saved ? C.primary : C.dark, color: C.white, border: 'none',
        borderRadius: 12, padding: '0.875rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)'
      }}>{saving ? 'Guardando...' : saved ? '✅ Guardado' : 'Guardar gastos del mes'}</button>

      <button onClick={restablecer} disabled={saving} style={{
        width: '100%', background: 'transparent', color: C.muted, border: `1px solid ${C.light}`,
        borderRadius: 12, padding: '0.7rem', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: '0.6rem'
      }}>↺ Restablecer este mes a los valores del balance</button>
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

  function setGastos(newGastos) {
    setData(prev => ({ ...prev, gastos: newGastos }))
  }

  const r = data?.resumen || {}
  const cb = data?.cloudbeds || {}
  const ing = data?.gastos?.ingresos || {}
  const cats = data?.gastos?.categorias || []
  const catManualTotal = cats.reduce((a, c) => a + (c.lineas || []).reduce((s, l) => s + (Number(l.valor) || 0), 0), 0)

  // Filas de liquidación (dinámicas por categoría) — sin fee fijo
  const liqRows = []
  liqRows.push({ label: 'Ingresos habitaciones', val: ing.habitaciones, type: 'ingreso' })
  liqRows.push({ label: 'Ingresos terraza (F&B)', val: ing.terraza, type: 'ingreso' })
  liqRows.push({ label: 'Ingresos SPA', val: ing.spa, type: 'ingreso' })
  liqRows.push({ label: 'Upselling y otros', val: (ing.upselling || 0) + (ing.otrosIngresos || 0), type: 'ingreso' })
  liqRows.push({ label: '─── TOTAL INGRESOS', val: r.totalIngresos, type: 'subtotal' })
  ;(data?.categoriasResumen || []).forEach(c => liqRows.push({ label: `${c.emoji || ''} ${c.label}`.trim(), val: -(c.subtotal || 0), type: 'gasto' }))
  if (r.totalRecibos > 0) liqRows.push({ label: '🧾 Recibos PDF', val: -r.totalRecibos, type: 'gasto' })
  liqRows.push({ label: '─── GOP (Gross Operating Profit)', val: r.GOP, type: 'subtotal' })
  liqRows.push({ label: 'Fee variable SOLARA (5% GOP)', val: -r.feeSolaraVariable, type: 'fee' })
  liqRows.push({ label: '═══ UTILIDAD NETA', val: r.utilidadNeta, type: 'total' })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: C.dark, padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: C.primary, fontSize: 16, letterSpacing: 3, fontWeight: 700, fontFamily: 'var(--font-display)' }}>WELLCOMM</span>
              <span style={{ color: C.muted, fontSize: 9, letterSpacing: 2 }}>✳ PROPIETARIOS</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{mes}</div>
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
                    { label: `Fee variable (5% GOP)`, val: fmtCOP(r.feeSolaraVariable), color: '#aaa' },
                    { label: 'Total fee SOLARA', val: fmtCOP(r.feeSolaraTotal), color: C.primary, bold: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < 1 ? `1px solid rgba(255,255,255,0.08)` : 'none' }}>
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
                    { label: '🏨 Habitaciones', val: ing.habitaciones, fuente: 'Cloudbeds' },
                    { label: '🍕 Terraza / F&B', val: ing.terraza, fuente: 'Manual' },
                    { label: '💆 SPA', val: ing.spa, fuente: 'Manual' },
                    { label: '✨ Upselling', val: ing.upselling, fuente: 'Manual' },
                    { label: '📦 Otros', val: ing.otrosIngresos, fuente: 'Manual' },
                  ].map((item, i) => {
                    const pct = r.totalIngresos > 0 ? Math.round(((item.val || 0) / r.totalIngresos) * 100) : 0
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
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Gastos e Ingresos del Mes</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '1.25rem' }}>Toca una categoría para expandirla y editar sus líneas. El mes arranca con los valores del mes anterior.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Gastos manuales', val: catManualTotal, color: '#e67e22' },
                    { label: 'Recibos PDF', val: r.totalRecibos, color: '#9b59b6' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: C.white, borderRadius: 10, padding: '0.75rem', border: `1px solid ${C.light}`, borderTop: `3px solid ${k.color}` }}>
                      <div style={{ fontSize: '0.62rem', color: C.muted, marginBottom: '0.25rem' }}>{k.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: k.color, fontFamily: 'var(--font-display)' }}>{fmt(k.val)}</div>
                    </div>
                  ))}
                </div>
                <GastosEditor gastos={data.gastos} mes={mes} onChange={setGastos} onSaved={cargarDatos} />
              </div>
            )}

            {seccion === 'liquidacion' && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300, marginBottom: '0.25rem' }}>Liquidación Mensual</div>
                <div style={{ fontSize: '0.78rem', color: C.muted, marginBottom: '0.75rem' }}>Resumen completo de {mes}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <button onClick={() => exportarPDFInforme(data, mes)} style={{ flex: 1, background: C.dark, color: '#fff', border: 'none', borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>⬇ Exportar PDF</button>
                  <button onClick={() => exportarExcelInforme(data, mes)} style={{ flex: 1, background: C.white, color: C.dark, border: `1px solid ${C.light}`, borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>⬇ Exportar Excel</button>
                </div>
                <div style={{ background: C.dark, borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                  <div style={{ color: C.primary, fontSize: '0.78rem', fontWeight: 600, marginBottom: '1rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>✳ CUENTA DE RESULTADOS · {mes.toUpperCase()}</div>
                  {liqRows.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0',
                      borderBottom: ['subtotal', 'total'].includes(row.type) ? `1px solid rgba(255,255,255,0.15)` : `1px solid rgba(255,255,255,0.05)`,
                      marginTop: row.type === 'total' ? '0.5rem' : 0
                    }}>
                      <span style={{ fontSize: row.type === 'total' ? '0.85rem' : '0.75rem', color: row.type === 'subtotal' ? '#ddd' : row.type === 'total' ? C.white : '#888', fontWeight: ['subtotal', 'total'].includes(row.type) ? 600 : 400 }}>{row.label}</span>
                      <span style={{ fontSize: row.type === 'total' ? '0.95rem' : '0.82rem', fontWeight: ['subtotal', 'total'].includes(row.type) ? 700 : 400, color: row.type === 'total' ? (r.utilidadNeta >= 0 ? C.primary : '#e74c3c') : row.type === 'subtotal' ? '#ddd' : row.type === 'fee' ? '#e67e22' : (row.val >= 0 ? C.primary : '#888') }}>
                        {row.val >= 0 ? fmtCOP(row.val) : `- ${fmtCOP(Math.abs(row.val))}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', border: `1px solid ${C.light}` }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '1rem' }}>Estructura de costos</div>
                  {[
                    { label: 'Gastos operativos / Ingresos', val: r.totalIngresos > 0 ? Math.round((r.totalCategorias / r.totalIngresos) * 100) : 0, color: '#3498db' },
                    { label: 'Recibos PDF / Ingresos', val: r.totalIngresos > 0 ? Math.round((r.totalRecibos / r.totalIngresos) * 100) : 0, color: '#e67e22' },
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
