import React, { useState } from 'react'

const SCREENS = {
  HOME: 'home',
  GUEST: 'guest',
  STAFF: 'staff',
  OWNER: 'owner',
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME)

  if (screen === SCREENS.GUEST) return <GuestScreen onBack={() => setScreen(SCREENS.HOME)} />
  if (screen === SCREENS.STAFF) return <StaffScreen onBack={() => setScreen(SCREENS.HOME)} />
  if (screen === SCREENS.OWNER) return <OwnerScreen onBack={() => setScreen(SCREENS.HOME)} />

  return <HomeScreen onSelect={setScreen} />
}

function HomeScreen({ onSelect }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      gap: '2rem'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.8rem',
          fontWeight: 300,
          letterSpacing: '0.15em',
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{
            width: 40, height: 40,
            border: '2px solid var(--color-text)',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}>✳</span>
          WELLCOMM
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          letterSpacing: '0.3em',
          color: 'var(--color-text-light)',
          marginTop: '0.25rem'
        }}>SPA & HOTEL · MANILA, MEDELLÍN</div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 360 }}>
        <MenuCard
          emoji="🛎️"
          title="Soy huésped"
          subtitle="Concierge, servicios y experiencias"
          color="var(--color-primary)"
          onClick={() => onSelect(SCREENS.GUEST)}
        />
        <MenuCard
          emoji="👥"
          title="Soy del equipo"
          subtitle="Concierge IA interno · Dashboard operativo"
          color="var(--color-text)"
          light
          onClick={() => onSelect(SCREENS.STAFF)}
        />
        <MenuCard
          emoji="📊"
          title="Soy propietario"
          subtitle="Revenue · Finanzas · KPIs"
          color="var(--color-bg-dark)"
          light
          onClick={() => onSelect(SCREENS.OWNER)}
        />
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em' }}>
        v1.0.0 · Gestionado por SOLARA Homes
      </div>
    </div>
  )
}

function MenuCard({ emoji, title, subtitle, color, light, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: light ? color : 'var(--color-white)',
        border: light ? 'none' : `2px solid ${color}`,
        borderRadius: 'var(--radius)',
        padding: '1.25rem 1.5rem',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
        width: '100%',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{ fontSize: '1.75rem' }}>{emoji}</span>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.2rem',
          fontWeight: 500,
          color: light ? 'var(--color-white)' : 'var(--color-text)'
        }}>{title}</div>
        <div style={{
          fontSize: '0.78rem',
          color: light ? 'rgba(255,255,255,0.7)' : 'var(--color-text-light)',
          marginTop: '0.2rem'
        }}>{subtitle}</div>
      </div>
    </button>
  )
}

function GuestScreen({ onBack }) {
  return (
    <PlaceholderScreen onBack={onBack} title="Concierge · Huésped" emoji="🛎️" color="var(--color-primary)" />
  )
}

function StaffScreen({ onBack }) {
  return (
    <PlaceholderScreen onBack={onBack} title="Panel del Equipo" emoji="👥" color="var(--color-text)" />
  )
}

function OwnerScreen({ onBack }) {
  return (
    <PlaceholderScreen onBack={onBack} title="Portal Propietario" emoji="📊" color="var(--color-bg-dark)" />
  )
}

function PlaceholderScreen({ onBack, title, emoji, color }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '2rem'
    }}>
      <div style={{ fontSize: '3rem' }}>{emoji}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.8rem',
        fontWeight: 300,
        letterSpacing: '0.1em'
      }}>{title}</div>
      <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
        Módulo en construcción — próximamente
      </div>
      <button
        onClick={onBack}
        style={{
          marginTop: '1rem',
          background: color,
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          padding: '0.75rem 2rem',
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
          cursor: 'pointer'
        }}
      >← Volver</button>
    </div>
  )
}
