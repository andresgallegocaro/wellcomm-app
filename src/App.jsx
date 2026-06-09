import React, { useState } from 'react'
import StaffConcierge from './StaffConcierge.jsx'
import Dashboard from './Dashboard.jsx'
import Briefing from './Briefing.jsx'
import Novedades from './Novedades.jsx'
import Habitaciones from './Habitaciones.jsx'
import Solicitudes from './Solicitudes.jsx'
import Checklist from './Checklist.jsx'
import GuestApp from './GuestApp.jsx'
import OwnerPortal from './OwnerPortal.jsx'
import RateIntelligence from './RateIntelligence.jsx'
import RevenueManager from './RevenueManager.jsx'
import AdminUsuarios from './AdminUsuarios.jsx'
import Mantenimiento from './Mantenimiento.jsx'
import Equipo from './Equipo.jsx'

const SCREENS = {
  HOME: 'home', GUEST: 'guest', STAFF: 'staff',
  STAFF_DASHBOARD: 'staff_dashboard', STAFF_BRIEFING: 'staff_briefing',
  STAFF_NOVEDADES: 'staff_novedades', STAFF_HABITACIONES: 'staff_habitaciones',
  STAFF_SOLICITUDES: 'staff_solicitudes', STAFF_CHECKLIST: 'staff_checklist',
  STAFF_RATES: 'staff_rates', STAFF_REVENUE: 'staff_revenue',
  STAFF_MANTENIMIENTO: 'staff_mantenimiento', STAFF_EQUIPO: 'staff_equipo',
  OWNER: 'owner', OWNER_REVENUE: 'owner_revenue', ADMIN: 'admin',
}

const C = {
  bg: '#E8F0EC', dark: '#1A1A1A', primary: '#7EC8A0', primaryDark: '#5aaa80',
  muted: '#7a8c82', light: '#d0ddd5', white: '#FFFFFF',
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME)
  const [sesion, setSesion] = useState(null)
  const go = s => () => setScreen(s)

  if (!sesion) return <LoginUnico onLogin={(s) => { setSesion(s); setScreen(SCREENS.HOME) }} />

  const acceso = sesion.acceso || []
  const puede = (zona) => acceso.includes(zona)
  const puedeAuditar = puede('auditoria')
  const puedeRevenue = puede('revenue')
  const nombreUsuario = sesion.usuario?.nombre || 'Desconocido'

  function logout() { setSesion(null); setScreen(SCREENS.HOME) }

  if (screen === SCREENS.GUEST) return <GuestApp onBack={go(SCREENS.HOME)} />
  if (screen === SCREENS.OWNER && puede('propietario')) return <OwnerPortal onBack={go(SCREENS.HOME)} onRevenue={puedeRevenue ? go(SCREENS.OWNER_REVENUE) : null} />
  if (screen === SCREENS.OWNER_REVENUE && puede('propietario') && puedeRevenue) return <RevenueManager onBack={go(SCREENS.OWNER)} />
  if (screen === SCREENS.ADMIN && puede('admin')) return <AdminUsuarios adminPin={sesion.adminPin} onBack={go(SCREENS.HOME)} />

  if (screen === SCREENS.STAFF && puede('operacion')) return <StaffConcierge onBack={go(SCREENS.HOME)} onDashboard={go(SCREENS.STAFF_DASHBOARD)} onBriefing={go(SCREENS.STAFF_BRIEFING)} onNovedades={go(SCREENS.STAFF_NOVEDADES)} onHabitaciones={go(SCREENS.STAFF_HABITACIONES)} onSolicitudes={go(SCREENS.STAFF_SOLICITUDES)} onChecklist={go(SCREENS.STAFF_CHECKLIST)} onRates={go(SCREENS.STAFF_RATES)} onRevenue={go(SCREENS.STAFF_REVENUE)} onMantenimiento={go(SCREENS.STAFF_MANTENIMIENTO)} onEquipo={go(SCREENS.STAFF_EQUIPO)} puedeRevenue={puedeRevenue} />
  if (screen === SCREENS.STAFF_DASHBOARD && puedeRevenue) return <Dashboard onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_BRIEFING) return <Briefing onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_NOVEDADES) return <Novedades onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_HABITACIONES) return <Habitaciones onBack={go(SCREENS.STAFF)} usuario={nombreUsuario} puedeAuditar={puedeAuditar} />
  if (screen === SCREENS.STAFF_MANTENIMIENTO) return <Mantenimiento onBack={go(SCREENS.STAFF)} usuario={nombreUsuario} puedePriorizar={puedeAuditar} />
  if (screen === SCREENS.STAFF_EQUIPO) return <Equipo onBack={go(SCREENS.STAFF)} usuario={nombreUsuario} puedeEditar={puedeAuditar} />
  if (screen === SCREENS.STAFF_SOLICITUDES) return <Solicitudes onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_CHECKLIST) return <Checklist onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_RATES && puedeRevenue) return <RateIntelligence onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_REVENUE && puedeRevenue) return <RevenueManager onBack={go(SCREENS.STAFF)} />

  return <HomeScreen sesion={sesion} puede={puede} onSelect={setScreen} onLogout={logout} />
}

function LoginUnico({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(pinFinal) {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin: pinFinal })
      })
      const d = await res.json()
      if (d.ok) {
        onLogin({ usuario: d.usuario, acceso: d.acceso, adminPin: d.usuario.esAdmin ? pinFinal : null })
      } else {
        setError('PIN incorrecto'); setPin('')
      }
    } catch {
      setError('Error de conexión'); setPin('')
    } finally { setLoading(false) }
  }

  function tecla(n) {
    if (n === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (n === '' || pin.length >= 6) return
    setPin(pin + n)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.dark, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '0.2em', color: C.primary, display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
          <span style={{ width: 36, height: 36, border: `2px solid ${C.primary}`, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>✳</span>
          WELLCOMM
        </div>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.3em', color: C.muted, marginTop: '0.4rem' }}>SPA & HOTEL · MEDELLÍN</div>
      </div>

      <div style={{ background: '#2a2a2a', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 320 }}>
        <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1.5rem', textAlign: 'center' }}>Introduce tu PIN</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${pin.length > i ? C.primary : '#444'}`, background: pin.length > i ? C.primary : 'transparent', transition: 'all 0.2s' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
            <button key={i} onClick={() => tecla(n)} disabled={loading} style={{
              background: n === '' ? 'transparent' : '#333', color: 'white', border: 'none',
              borderRadius: 12, padding: '1rem', fontSize: '1.2rem',
              cursor: n === '' ? 'default' : 'pointer', fontFamily: 'var(--font-body)'
            }}>{n}</button>
          ))}
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: '0.78rem', textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}
        <button onClick={() => entrar(pin)} disabled={pin.length < 4 || loading} style={{
          width: '100%', background: pin.length >= 4 ? C.primary : '#333',
          color: pin.length >= 4 ? C.dark : '#666', border: 'none', borderRadius: 12,
          padding: '0.875rem', fontSize: '0.88rem', fontWeight: 600,
          cursor: pin.length >= 4 ? 'pointer' : 'default', fontFamily: 'var(--font-body)'
        }}>{loading ? 'Verificando...' : 'Acceder →'}</button>
      </div>
      <div style={{ fontSize: '0.68rem', color: C.muted, letterSpacing: '0.1em', marginTop: '2rem' }}>v2.8.0 · Gestionado por SOLARA Homes</div>
    </div>
  )
}

function HomeScreen({ sesion, puede, onSelect, onLogout }) {
  const u = sesion.usuario
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 300, letterSpacing: '0.15em', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <span style={{ width: 40, height: 40, border: '2px solid var(--color-text)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✳</span>
          WELLCOMM
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.3em', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>SPA & HOTEL · MANILA, MEDELLÍN</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', marginTop: '0.75rem' }}>Hola, <strong>{u.nombre}</strong></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 360 }}>
        {puede('operacion') && (
          <MenuCard emoji="🛎️" title="Modo huésped" subtitle="Check-in · Concierge · Servicios · Explorar" light={false} color="var(--color-primary)" onClick={() => onSelect(SCREENS.GUEST)} />
        )}
        {puede('operacion') && (
          <MenuCard emoji="👥" title="Equipo" subtitle="Concierge · Habitaciones · Mantenimiento · Operación" light color="var(--color-text)" onClick={() => onSelect(SCREENS.STAFF)} />
        )}
        {puede('propietario') && (
          <MenuCard emoji="📊" title="Portal del Propietario" subtitle="Revenue · Gastos · Liquidación · KPIs en tiempo real" light color="#2c3e50" onClick={() => onSelect(SCREENS.OWNER)} />
        )}
        {puede('admin') && (
          <MenuCard emoji="⚙️" title="Gestión de usuarios" subtitle="Crear y administrar accesos del equipo y propietarios" light color="#8e44ad" onClick={() => onSelect(SCREENS.ADMIN)} />
        )}
      </div>

      <button onClick={onLogout} style={{ background: 'none', border: '1px solid var(--color-text-light)', borderRadius: 10, color: 'var(--color-text-light)', padding: '0.5rem 1.2rem', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-body)' }}>Cerrar sesión</button>

      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em' }}>v2.8.0 · Gestionado por SOLARA Homes</div>
    </div>
  )
}

function MenuCard({ emoji, title, subtitle, color, light, onClick }) {
  return (
    <button onClick={onClick} style={{ background: light ? color : 'var(--color-white)', border: light ? 'none' : `2px solid ${color}`, borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow)', transition: 'transform 0.15s ease', cursor: 'pointer', width: '100%' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <span style={{ fontSize: '1.75rem' }}>{emoji}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500, color: light ? 'var(--color-white)' : 'var(--color-text)' }}>{title}</div>
        <div style={{ fontSize: '0.78rem', color: light ? 'rgba(255,255,255,0.7)' : 'var(--color-text-light)', marginTop: '0.2rem' }}>{subtitle}</div>
      </div>
    </button>
  )
}
