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

const SCREENS = {
  HOME: 'home', GUEST: 'guest', STAFF: 'staff',
  STAFF_DASHBOARD: 'staff_dashboard', STAFF_BRIEFING: 'staff_briefing',
  STAFF_NOVEDADES: 'staff_novedades', STAFF_HABITACIONES: 'staff_habitaciones',
  STAFF_SOLICITUDES: 'staff_solicitudes', STAFF_CHECKLIST: 'staff_checklist',
  OWNER: 'owner',
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME)
  const go = s => () => setScreen(s)

  if (screen === SCREENS.GUEST) return <GuestApp onBack={go(SCREENS.HOME)} />
  if (screen === SCREENS.OWNER) return <OwnerPortal onBack={go(SCREENS.HOME)} />
  if (screen === SCREENS.STAFF) return <StaffConcierge onBack={go(SCREENS.HOME)} onDashboard={go(SCREENS.STAFF_DASHBOARD)} onBriefing={go(SCREENS.STAFF_BRIEFING)} onNovedades={go(SCREENS.STAFF_NOVEDADES)} onHabitaciones={go(SCREENS.STAFF_HABITACIONES)} onSolicitudes={go(SCREENS.STAFF_SOLICITUDES)} onChecklist={go(SCREENS.STAFF_CHECKLIST)} />
  if (screen === SCREENS.STAFF_DASHBOARD) return <Dashboard onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_BRIEFING) return <Briefing onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_NOVEDADES) return <Novedades onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_HABITACIONES) return <Habitaciones onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_SOLICITUDES) return <Solicitudes onBack={go(SCREENS.STAFF)} />
  if (screen === SCREENS.STAFF_CHECKLIST) return <Checklist onBack={go(SCREENS.STAFF)} />

  return <HomeScreen onSelect={setScreen} />
}

function HomeScreen({ onSelect }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 300, letterSpacing: '0.15em', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 40, height: 40, border: '2px solid var(--color-text)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✳</span>
          WELLCOMM
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', letterSpacing: '0.3em', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>SPA & HOTEL · MANILA, MEDELLÍN</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 360 }}>
        <MenuCard emoji="🛎️" title="Soy huésped" subtitle="Check-in · Concierge · Servicios · Explorar" light={false} color="var(--color-primary)" onClick={() => onSelect(SCREENS.GUEST)} />
        <MenuCard emoji="👥" title="Soy del equipo" subtitle="Concierge · Dashboard · Briefing · Novedades · Habitaciones · Solicitudes · Checklist" light color="var(--color-text)" onClick={() => onSelect(SCREENS.STAFF)} />
        <MenuCard emoji="📊" title="Soy propietario" subtitle="Revenue · Gastos · Liquidación · KPIs en tiempo real" light color="#2c3e50" onClick={() => onSelect(SCREENS.OWNER)} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em' }}>v2.0.0 · Gestionado por SOLARA Homes</div>
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
