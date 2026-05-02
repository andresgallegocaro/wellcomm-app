import { useState, useEffect, useRef } from 'react'

const C = {
  bg: '#E8F0EC',
  dark: '#1A1A1A',
  primary: '#7EC8A0',
  primaryDark: '#5aaa80',
  text: '#1A1A1A',
  muted: '#7a8c82',
  light: '#d0ddd5',
  white: '#FFFFFF',
  cream: '#F5F8F6',
}

const UPSELLS = [
  { id: 1, icon: '💆', title: 'Masaje Relajante', desc: '60 min · Spa Siana · aceites premium', price: '150.000 COP', tag: 'Popular' },
  { id: 2, icon: '💆', title: 'Masaje de Tejido Profundo', desc: '60 min · para alivio muscular', price: '160.000 COP', tag: null },
  { id: 3, icon: '🧖', title: 'Facial Wellness', desc: 'Tratamiento facial revitalizante', price: '130.000 COP', tag: 'Nuevo' },
  { id: 4, icon: '🛁', title: 'Baño Termal', desc: 'Turkish bath + jacuzzi + steam room', price: '80.000 COP', tag: null },
  { id: 5, icon: '🍕', title: 'Cena en Terraza', desc: 'The Terrace · pizza artesanal + vinos', price: 'Desde 45.000 COP', tag: 'Recomendado' },
  { id: 6, icon: '🍾', title: 'Pack Bienvenida', desc: 'Vino + flores + snacks locales', price: '120.000 COP', tag: 'Romántico' },
  { id: 7, icon: '🚗', title: 'Traslado Aeropuerto', desc: 'Vehículo privado · conductor bilingüe', price: '95.000 COP', tag: null },
  { id: 8, icon: '🧘', title: 'Sesión de Yoga', desc: 'Mañana privada en terraza', price: '80.000 COP', tag: null },
]

const EXPLORE = [
  { emoji: '🌿', name: 'Parque El Poblado', cat: 'Naturaleza', dist: '5 min', tip: 'Perfecto para mañanas tranquilas. Mercado artesanal los sábados.' },
  { emoji: '🛍️', name: 'Provenza', cat: 'Compras & Gastronomía', dist: '3 min', tip: 'El corazón del barrio. Diseñadores locales y cafés de especialidad.' },
  { emoji: '☕', name: 'Pergamino Café', cat: 'Café Specialty', dist: '8 min', tip: 'El mejor café de Medellín. Prueba el V60 de Huila.' },
  { emoji: '🍽️', name: 'Celele', cat: 'Restaurante', dist: '10 min', tip: 'Cocina caribeña de autor. Reserva con anticipación.' },
  { emoji: '🎨', name: 'MAMM', cat: 'Cultura', dist: '15 min taxi', tip: 'Museo de Arte Moderno. Entrada gratuita domingos.' },
  { emoji: '🍸', name: 'El Social', cat: 'Cocktail Bar', dist: '10 min', tip: 'Cócteles creativos con vista. Recomendado para después de las 9pm.' },
  { emoji: '🌺', name: 'Jardín Botánico', cat: 'Naturaleza', dist: '20 min taxi', tip: 'Impresionante orquideario. Ideal para la mañana.' },
]

const NAV = [
  { id: 'home', icon: '🏠', label: 'Inicio' },
  { id: 'checkin', icon: '✅', label: 'Check-in' },
  { id: 'info', icon: 'ℹ️', label: 'Mi Estadía' },
  { id: 'services', icon: '✨', label: 'Servicios' },
  { id: 'explore', icon: '🗺️', label: 'Explorar' },
  { id: 'chat', icon: '💬', label: 'Concierge' },
]

const TYC_TEXT = `TÉRMINOS Y CONDICIONES — WELLcomm Spa & Hotel

1. ACEPTACIÓN
Al completar el check-in, el huésped acepta íntegramente estos Términos y Condiciones. Esta aceptación tiene carácter vinculante bajo la legislación colombiana.

2. USO DEL INMUEBLE
Las habitaciones se destinan exclusivamente para uso de alojamiento turístico. Queda expresamente prohibido:
- Fiestas o eventos con personas distintas a los huéspedes registrados
- Actividades comerciales de cualquier naturaleza
- Turismo sexual o cualquier actividad ilícita
- Reuniones que excedan la capacidad máxima de la habitación

3. CAPACIDAD MÁXIMA
Solo pueden pernoctar las personas registradas en la reserva. No se admiten visitantes nocturnos (22:00h – 08:00h) sin autorización previa.

4. HORARIOS
- Check-in: desde las 15:00h
- Check-out: hasta las 12:00h
- Silencio: 22:00h – 08:00h
- Spa Siana: 8:00h – 20:00h
- The Terrace: 13:00h – 23:00h

5. MASCOTAS Y TABACO
No se permite fumar en el interior ni en las áreas comunes. Las mascotas no están permitidas en el hotel.

6. CUIDADO DE LAS INSTALACIONES
El huésped se compromete a entregar la habitación en el mismo estado en que la recibió. Cualquier daño será cobrado a valor de reposición + 20% de penalización.

7. CANCELACIONES
- Más de 7 días: reembolso del 80%
- 3–7 días: reembolso del 50%
- Menos de 72h: sin reembolso
- No-show: sin reembolso

8. PRIVACIDAD
Los datos del huésped se tratan conforme a la Ley 1581 de 2012 (Habeas Data Colombia) y se usan exclusivamente para la gestión de la reserva.

TABLA DE MULTAS Y PENALIZACIONES:
- Fiesta o evento no autorizado: USD 500
- Superar capacidad máxima: COP 300.000/persona adicional
- Fumar en el interior: COP 300.000 + limpieza especializada
- Daños a muebles o equipamiento: valor de reposición + 20%
- Check-out tardío sin autorización: COP 100.000/hora
- Pérdida de llave o tarjeta: COP 50.000

Al aceptar, declaro haber leído y comprendido íntegramente estos Términos y Condiciones.`

function StepDatos({ onComplete }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', tipoDoc: 'Cédula', numDoc: '',
    nacionalidad: '', fechaNac: '', email: '', telefono: '',
  })
  const f = k => v => setForm(p => ({ ...p, [k]: v }))
  const valid = form.nombre && form.apellido && form.numDoc && form.email

  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        Información requerida por ley colombiana para alojamientos turísticos (Decreto 2590/2009).
      </div>
      {[
        { label: 'Nombre *', key: 'nombre', placeholder: 'Ej. Carlos' },
        { label: 'Apellido(s) *', key: 'apellido', placeholder: 'Ej. Méndez García' },
      ].map(({ label, key, placeholder }) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>{label.toUpperCase()}</label>
          <input value={form[key]} onChange={e => f(key)(e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, fontFamily: 'var(--font-body)', color: C.text, boxSizing: 'border-box' }} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>TIPO DOCUMENTO *</label>
          <select value={form.tipoDoc} onChange={e => f('tipoDoc')(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, color: C.text, boxSizing: 'border-box' }}>
            {['Cédula', 'Pasaporte', 'Cédula Extranjería', 'DNI', 'Otro'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>NÚMERO *</label>
          <input value={form.numDoc} onChange={e => f('numDoc')(e.target.value)} placeholder="123456789"
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, color: C.text, boxSizing: 'border-box' }} />
        </div>
      </div>
      {[
        { label: 'Nacionalidad', key: 'nacionalidad', placeholder: 'Ej. Colombiana' },
        { label: 'Fecha de nacimiento', key: 'fechaNac', placeholder: 'DD/MM/AAAA' },
        { label: 'Email *', key: 'email', placeholder: 'correo@ejemplo.com', type: 'email' },
        { label: 'Teléfono / WhatsApp', key: 'telefono', placeholder: '+57 300 000 0000' },
      ].map(({ label, key, placeholder, type = 'text' }) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>{label.toUpperCase()}</label>
          <input type={type} value={form[key]} onChange={e => f(key)(e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.light}`, borderRadius: 8, fontSize: 13, outline: 'none', background: C.white, color: C.text, boxSizing: 'border-box' }} />
        </div>
      ))}
      <button onClick={() => valid && onComplete(form)} disabled={!valid}
        style={{ width: '100%', background: valid ? C.dark : C.light, color: C.white, border: 'none', borderRadius: 10, padding: '14px', cursor: valid ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
        Continuar →
      </button>
    </div>
  )
}

function StepTyC({ onComplete }) {
  const [read, setRead] = useState(false)
  const [accepted, setAccepted] = useState(false)

  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
        Lee los términos completos antes de aceptar.
      </div>
      <div onScroll={e => { const el = e.target; if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setRead(true) }}
        style={{ background: C.white, border: `1px solid ${C.light}`, borderRadius: 10, padding: '14px 16px', maxHeight: 280, overflowY: 'auto', fontSize: 12, lineHeight: 1.7, color: C.text, whiteSpace: 'pre-line', marginBottom: 14 }}>
        {TYC_TEXT}
        <div style={{ height: 20 }} />
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}>— Fin de los Términos y Condiciones —</div>
      </div>
      {!read && (
        <div style={{ background: '#fff3cd', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#856404', marginBottom: 12, textAlign: 'center' }}>
          ↓ Desplázate hasta el final para poder aceptar
        </div>
      )}
      {read && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer', accentColor: C.dark }} />
          <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            He leído y acepto íntegramente los Términos y Condiciones de WELLcomm Spa & Hotel.
          </span>
        </label>
      )}
      <button onClick={() => accepted && onComplete()} disabled={!accepted}
        style={{ width: '100%', background: accepted ? C.dark : C.light, color: C.white, border: 'none', borderRadius: 10, padding: '14px', cursor: accepted ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
        Acepto los Términos y Condiciones →
      </button>
    </div>
  )
}

function StepInstrucciones({ habitacion, onComplete }) {
  const [read, setRead] = useState(false)

  const instrucciones = `📍 DIRECCIÓN
WELLcomm Spa & Hotel
Carrera 43E #11-37, Barrio Manila, El Poblado, Medellín

🚗 CÓMO LLEGAR

Desde el aeropuerto José María Córdova (Rionegro):
- Bus Aircoach hacia el centro (~45 min, COP 14.000)
- Uber / InDriver desde el aeropuerto (~COP 80.000–100.000, 45 min)
- Indica: Carrera 43E #11-37, Manila, El Poblado

Desde el aeropuerto Olaya Herrera:
- Uber / InDriver ~10 min (COP 10.000–15.000)

Desde el Metro:
- Estación Poblado (Línea A) → camina 8 min o Uber 3 min

🏢 LLEGADA AL HOTEL

1. Llega a Carrera 43E #11-37, Barrio Manila
2. El equipo de recepción te estará esperando
3. Check-in con protocolo wellness: aromaterapia + Ochibori
4. Horario de check-in: desde las 15:00h

🛏️ TU HABITACIÓN
${habitacion || 'Será asignada al momento del check-in'}

⏰ HORARIOS
- Check-in: desde las 15:00h
- Check-out: hasta las 12:00h
- Spa Siana: 8:00h – 20:00h
- The Terrace: 13:00h – 23:00h (martes a domingo)

📶 WIFI
La contraseña WiFi te será entregada en recepción al hacer check-in.

🧖 SPA SIANA
Reserva tus tratamientos con anticipación hablando con el concierge o en recepción. Incluye: masajes, facial, baño termal, jacuzzi y steam room.

🍕 THE TERRACE
Nuestro rooftop con pizzas artesanales y vistas al barrio Manila. Abre martes a domingo desde las 13:00h.

🆘 CONTACTO 24/7
Recepción: +57 324 6249064
Email: frontdesk@wellcommhotels.com
WhatsApp disponible en recepción`

  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
        Lee las instrucciones completas para llegar sin problemas.
      </div>
      <div onScroll={e => { const el = e.target; if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setRead(true) }}
        style={{ background: C.white, border: `1px solid ${C.light}`, borderRadius: 10, padding: '14px 16px', maxHeight: 320, overflowY: 'auto', fontSize: 12, lineHeight: 1.8, color: C.text, whiteSpace: 'pre-line', marginBottom: 14 }}>
        {instrucciones}
        <div style={{ height: 20 }} />
        <div style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}>— Fin de las instrucciones —</div>
      </div>
      {!read && (
        <div style={{ background: '#fff3cd', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#856404', marginBottom: 12, textAlign: 'center' }}>
          ↓ Desplázate hasta el final para confirmar
        </div>
      )}
      <button onClick={() => read && onComplete()} disabled={!read}
        style={{ width: '100%', background: read ? C.dark : C.light, color: C.white, border: 'none', borderRadius: 10, padding: '14px', cursor: read ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
        ✓ He leído las instrucciones →
      </button>
    </div>
  )
}

export default function GuestApp({ onBack, reserva }) {
  const res = reserva || {
    id: 'WC-001',
    guestName: 'Huésped',
    habitacion: 'SE-502',
    checkin: '2026-05-03',
    checkout: '2026-05-06',
    nights: 3,
    guests: 2,
    wifiName: 'WELLcomm_Guest',
    wifiPass: 'wellness2024',
    status: 'Confirmada',
  }

  const [section, setSection] = useState('home')
  const [checkinStep, setCheckinStep] = useState(0)
  const [activeSubStep, setActiveSubStep] = useState(null)
  const [guestData, setGuestData] = useState(null)
  const [wifiVisible, setWifiVisible] = useState(false)
  const [cart, setCart] = useState([])
  const [toast, setToast] = useState('')
  const [chatMsgs, setChatMsgs] = useState([{
    role: 'assistant',
    text: `✳ Bienvenido a WELLcomm, ${res.guestName.split(' ')[0]}.\n\nSoy tu concierge personal. Puedo ayudarte con el spa, la terraza, servicios, horarios o cualquier cosa que necesites durante tu estadía.\n\n¿En qué puedo ayudarte?`
  }])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const addToCart = item => {
    if (!cart.find(c => c.id === item.id)) {
      setCart(prev => [...prev, item])
      showToast(`✅ ${item.title} añadido`)
    } else {
      setCart(prev => prev.filter(c => c.id !== item.id))
    }
  }

  const submitServices = () => {
    if (!cart.length) return
    showToast('✅ Solicitud enviada. El equipo te contactará pronto.')
    setCart([])
  }

  const completeCheckinStep = stepIndex => {
    const next = checkinStep + 1
    setCheckinStep(next)
    setActiveSubStep(null)
    showToast('✅ Paso completado')
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user', text: chatInput }
    const updated = [...chatMsgs, userMsg]
    setChatMsgs(updated)
    setChatInput('')
    setChatLoading(true)
    try {
      const res2 = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          role: 'guest',
          context: `El huésped se llama ${res.guestName}, está en la habitación ${res.habitacion}, check-in ${res.checkin}, check-out ${res.checkout}, ${res.nights} noches.`
        })
      })
      const data = await res2.json()
      setChatMsgs([...updated, { role: 'assistant', text: data.reply }])
    } catch {
      setChatMsgs([...updated, { role: 'assistant', text: 'Contáctanos en recepción o al +57 324 6249064 🙏' }])
    }
    setChatLoading(false)
  }

  const progressPct = (checkinStep / 4) * 100

  const daysInfo = () => {
    const diff = Math.ceil((new Date(res.checkin) - new Date()) / 86400000)
    if (diff > 0) return `Faltan ${diff} días para tu llegada`
    if (diff === 0) return '¡Hoy es tu llegada! Bienvenido'
    return `Día ${Math.abs(diff) + 1} de ${res.nights} · ¡Disfruta!`
  }

  const STEPS = [
    { icon: '👤', title: 'Datos personales', desc: 'Nombre, documento, contacto' },
    { icon: '📋', title: 'Términos y condiciones', desc: 'Leer y aceptar políticas' },
    { icon: '🔑', title: 'Confirmación', desc: 'Tu reserva confirmada' },
    { icon: '🗺️', title: 'Instrucciones de llegada', desc: 'Cómo llegar a WELLcomm' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: C.bg, minHeight: '100vh', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: C.dark, color: C.white, padding: '10px 20px', borderRadius: 30, fontSize: 12, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.dark, padding: '16px 18px 12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: C.primary, fontSize: 17, letterSpacing: 3, fontWeight: 700, fontFamily: 'var(--font-display)' }}>WELLCOMM</span>
              <span style={{ color: '#7a8c82', fontSize: 9, letterSpacing: 2 }}>✳ SPA & HOTEL</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>Manila · Medellín · Hab. {res.habitacion}</div>
          </div>
          <div style={{ background: '#2a2a2a', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: C.primary, fontWeight: 600 }}>
            {res.status || 'Confirmada'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.primary }} />
          <span style={{ color: '#7a8c82', fontSize: 9, letterSpacing: 1 }}>CONCIERGE IA ACTIVO · {res.id}</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: C.dark, display: 'flex', borderBottom: `2px solid ${C.primary}`, overflowX: 'auto' }}>
        {NAV.map(s => (
          <button key={s.id} onClick={() => { setSection(s.id); setActiveSubStep(null) }} style={{
            flex: '0 0 auto',
            background: section === s.id ? C.primary : 'transparent',
            color: section === s.id ? C.dark : '#aaa',
            border: 'none', cursor: 'pointer', padding: '9px 12px',
            fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            fontFamily: 'var(--font-body)', minWidth: 60,
          }}>
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            <span style={{ fontWeight: section === s.id ? 700 : 400 }}>{s.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>

        {/* HOME */}
        {section === 'home' && (
          <div>
            <div style={{ background: `linear-gradient(155deg, #1A1A1A 0%, #2a3528 55%, #1a2218 100%)`, padding: '22px 20px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, background: `radial-gradient(circle, ${C.primary}22, transparent 70%)`, borderRadius: '50%' }} />
              <div style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, marginBottom: 4, fontFamily: 'var(--font-display)' }}>BIENVENIDO</div>
              <div style={{ color: C.white, fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 300 }}>{res.guestName.split(' ')[0]} ✳</div>
              <div style={{ color: C.primary, fontSize: 13, marginBottom: 4 }}>WELLcomm Spa & Hotel</div>
              <div style={{ color: '#7a8c82', fontSize: 11, marginBottom: 16 }}>{daysInfo()}</div>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', border: `1px solid rgba(126,200,160,0.25)` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'CHECK-IN', val: res.checkin?.slice(5).replace('-', '/') },
                    { label: 'NOCHES', val: res.nights },
                    { label: 'HUÉSPEDES', val: res.guests },
                    { label: 'CHECKOUT', val: res.checkout?.slice(5).replace('-', '/') },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ color: C.primary, fontSize: 17, fontWeight: 600 }}>{item.val}</div>
                      <div style={{ color: '#7a8c82', fontSize: 8, letterSpacing: 0.5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 18px 4px' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>ACCIONES RÁPIDAS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '✅', label: 'Check-in Online', sub: checkinStep >= 4 ? 'Completado ✓' : `Paso ${checkinStep}/4`, action: () => setSection('checkin') },
                  { icon: '📶', label: 'WiFi', sub: 'Ver contraseña', action: () => { setWifiVisible(true); setSection('info') } },
                  { icon: '💆', label: 'Reservar Spa', sub: 'Siana · 8am–8pm', action: () => setSection('services') },
                  { icon: '💬', label: 'Concierge IA', sub: 'Responde al instante', action: () => setSection('chat') },
                ].map((q, i) => (
                  <button key={i} onClick={q.action} style={{ background: C.white, border: `1px solid ${C.light}`, borderRadius: 12, padding: '14px 12px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 24, marginBottom: 5 }}>{q.icon}</div>
                    <div style={{ fontSize: 12, color: C.dark, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{q.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{q.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Servicios destacados */}
            <div style={{ margin: '12px 18px 0' }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>EXPERIENCIAS WELLCOMM</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {[
                  { emoji: '🧖', label: 'Spa Siana', sub: 'Masajes · Facial · Baño termal' },
                  { emoji: '🍕', label: 'The Terrace', sub: 'Rooftop · Pizza · Vinos' },
                  { emoji: '🌿', label: 'Wellness', sub: 'Yoga · Meditación · Bienestar' },
                ].map((s, i) => (
                  <div key={i} onClick={() => setSection('services')} style={{ background: C.white, borderRadius: 12, padding: '12px 14px', minWidth: 140, border: `1px solid ${C.light}`, cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, fontFamily: 'var(--font-display)' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Check-in progress */}
            <div style={{ margin: '12px 18px 0', background: C.white, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.light}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, fontFamily: 'var(--font-display)' }}>Check-in Online</span>
                <span style={{ fontSize: 11, color: C.primary }}>{checkinStep}/4 pasos</span>
              </div>
              <div style={{ background: C.light, borderRadius: 10, height: 5, marginBottom: 10 }}>
                <div style={{ background: checkinStep >= 4 ? C.primary : C.dark, height: 5, borderRadius: 10, width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
              </div>
              <button onClick={() => setSection('checkin')} style={{ background: checkinStep >= 4 ? '#E8F5EE' : C.dark, color: checkinStep >= 4 ? C.primary : C.white, border: checkinStep >= 4 ? `1px solid ${C.primary}` : 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, width: '100%', fontWeight: 600 }}>
                {checkinStep >= 4 ? '✓ Check-in completado' : 'Completar check-in →'}
              </button>
            </div>
          </div>
        )}

        {/* CHECK-IN */}
        {section === 'checkin' && (
          <div style={{ padding: '18px' }}>
            {activeSubStep === 'datos' && (
              <div>
                <button onClick={() => setActiveSubStep(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Volver</button>
                <div style={{ fontSize: 18, color: C.dark, marginBottom: 4, fontFamily: 'var(--font-display)' }}>👤 Datos Personales</div>
                <StepDatos onComplete={data => { setGuestData(data); completeCheckinStep(0) }} />
              </div>
            )}
            {activeSubStep === 'tyc' && (
              <div>
                <button onClick={() => setActiveSubStep(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Volver</button>
                <div style={{ fontSize: 18, color: C.dark, marginBottom: 4, fontFamily: 'var(--font-display)' }}>📋 Términos y Condiciones</div>
                <StepTyC onComplete={() => completeCheckinStep(1)} />
              </div>
            )}
            {activeSubStep === 'instrucciones' && (
              <div>
                <button onClick={() => setActiveSubStep(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>← Volver</button>
                <div style={{ fontSize: 18, color: C.dark, marginBottom: 4, fontFamily: 'var(--font-display)' }}>🗺️ Instrucciones de Llegada</div>
                <StepInstrucciones habitacion={res.habitacion} onComplete={() => completeCheckinStep(3)} />
              </div>
            )}
            {!activeSubStep && (
              <>
                <div style={{ fontSize: 20, color: C.dark, marginBottom: 4, fontFamily: 'var(--font-display)', fontWeight: 300 }}>Check-in Online</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>Completa todos los pasos antes de tu llegada</div>
                <div style={{ background: C.light, borderRadius: 10, height: 7, marginBottom: 20 }}>
                  <div style={{ background: checkinStep >= 4 ? C.primary : C.dark, height: 7, borderRadius: 10, width: `${progressPct}%`, transition: 'width 0.5s' }} />
                </div>
                {STEPS.map((step, i) => {
                  const done = i < checkinStep
                  const active = i === checkinStep
                  const subStepKey = i === 0 ? 'datos' : i === 1 ? 'tyc' : i === 3 ? 'instrucciones' : null
                  return (
                    <div key={i} style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${done ? C.dark : active ? C.primary : C.light}`, opacity: i > checkinStep ? 0.45 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: done ? C.dark : active ? C.primary : C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 16 : 18, color: done ? C.white : C.dark, flexShrink: 0, fontWeight: 700 }}>
                          {done ? '✓' : step.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{step.title}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{step.desc}</div>
                        </div>
                        {active && (
                          <button onClick={() => subStepKey ? setActiveSubStep(subStepKey) : (() => { completeCheckinStep(i) })()}
                            style={{ background: C.dark, color: C.white, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {subStepKey ? 'Abrir →' : 'Confirmar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {checkinStep >= 4 && (
                  <div style={{ background: '#E8F5EE', border: `1px solid ${C.primary}`, borderRadius: 12, padding: 16, marginTop: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.primaryDark, fontFamily: 'var(--font-display)' }}>Check-in completado</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>¡Te esperamos en WELLcomm!</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* INFO */}
        {section === 'info' && (
          <div style={{ padding: '18px' }}>
            <div style={{ fontSize: 20, color: C.dark, marginBottom: 14, fontFamily: 'var(--font-display)', fontWeight: 300 }}>Tu Estadía</div>
            <div style={{ background: C.white, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${C.light}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>📶 WiFi</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{res.wifiName}</div>
                  <div style={{ fontSize: 15, color: C.dark, fontWeight: 700, marginTop: 5, letterSpacing: 1.5, fontFamily: 'monospace' }}>
                    {wifiVisible ? res.wifiPass : '••••••••••••'}
                  </div>
                </div>
                <button onClick={() => setWifiVisible(!wifiVisible)} style={{ background: C.dark, color: C.white, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 11 }}>
                  {wifiVisible ? 'Ocultar' : 'Ver clave'}
                </button>
              </div>
            </div>
            {[
              { icon: '🏨', label: 'Hotel', val: 'WELLcomm Spa & Hotel' },
              { icon: '📍', label: 'Dirección', val: 'Cra. 43E #11-37, Manila, El Poblado' },
              { icon: '🛏️', label: 'Habitación', val: res.habitacion },
              { icon: '📅', label: 'Check-in', val: `${res.checkin} · desde 15:00h` },
              { icon: '📅', label: 'Check-out', val: `${res.checkout} · hasta 12:00h` },
              { icon: '💆', label: 'Spa Siana', val: 'Lunes a domingo · 8:00h – 20:00h' },
              { icon: '🍕', label: 'The Terrace', val: 'Martes a domingo · 13:00h – 23:00h' },
              { icon: '📞', label: 'Recepción 24/7', val: '+57 324 6249064' },
            ].map((item, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 10, padding: '11px 14px', marginBottom: 6, border: `1px solid ${C.light}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 9, color: C.muted }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: C.dark, fontWeight: 600 }}>{item.val}</div>
                </div>
              </div>
            ))}
            <div style={{ background: C.dark, borderRadius: 12, padding: 14, marginTop: 6 }}>
              <div style={{ color: C.primary, fontSize: 12, fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-display)' }}>✳ Normas del Hotel</div>
              {[
                'No fumar en interiores ni áreas comunes',
                'No mascotas permitidas',
                'Silencio desde las 22:00h',
                'No fiestas ni eventos privados',
                'Capacidad máxima según reserva',
              ].map((r, i) => (
                <div key={i} style={{ color: '#ccc', fontSize: 11, marginBottom: 5, display: 'flex', gap: 8 }}>
                  <span style={{ color: C.primary }}>—</span>{r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVICES */}
        {section === 'services' && (
          <div style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 20, color: C.dark, fontFamily: 'var(--font-display)', fontWeight: 300 }}>Servicios</div>
              {cart.length > 0 && <div style={{ background: C.primary, color: C.dark, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>{cart.length} selec.</div>}
            </div>
            {UPSELLS.map(item => {
              const inCart = !!cart.find(c => c.id === item.id)
              return (
                <div key={item.id} style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${inCart ? C.primary : C.light}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.title}</span>
                        {item.tag && <span style={{ background: C.bg, color: C.dark, fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{item.tag}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, margin: '3px 0' }}>{item.desc}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{item.price}</div>
                    </div>
                    <button onClick={() => addToCart(item)} style={{ background: inCart ? C.dark : C.bg, color: inCart ? C.white : C.dark, border: `1px solid ${C.dark}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 18 }}>
                      {inCart ? '✓' : '+'}
                    </button>
                  </div>
                </div>
              )
            })}
            {cart.length > 0 && (
              <button onClick={submitServices} style={{ background: C.dark, color: C.white, border: 'none', borderRadius: 12, padding: 16, cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                ✳ Solicitar {cart.length} servicio{cart.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* EXPLORE */}
        {section === 'explore' && (
          <div style={{ padding: '18px' }}>
            <div style={{ fontSize: 20, color: C.dark, marginBottom: 4, fontFamily: 'var(--font-display)', fontWeight: 300 }}>Explorar</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>Alrededor de Manila · Selección WELLcomm</div>
            {EXPLORE.map((place, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 8, border: `1px solid ${C.light}` }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{place.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{place.name}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>{place.dist}</span>
                    </div>
                    <div style={{ fontSize: 9, color: C.primary, letterSpacing: 1, marginBottom: 6 }}>{place.cat.toUpperCase()}</div>
                    <div style={{ background: C.bg, borderRadius: 8, padding: '7px 10px', fontSize: 11, color: C.muted, fontStyle: 'italic', borderLeft: `3px solid ${C.primary}` }}>
                      💡 {place.tip}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHAT */}
        {section === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 132px)' }}>
            <div style={{ padding: '12px 18px 8px', borderBottom: `1px solid ${C.light}` }}>
              <div style={{ fontSize: 18, color: C.dark, fontFamily: 'var(--font-display)', fontWeight: 300 }}>Concierge WELLcomm</div>
              <div style={{ fontSize: 10, color: C.muted }}>IA con contexto de tu estadía · 24/7</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMsgs.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, background: C.dark, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: C.primary, marginRight: 8, flexShrink: 0, marginTop: 2 }}>✳</div>
                  )}
                  <div style={{ background: msg.role === 'user' ? C.dark : C.white, color: msg.role === 'user' ? C.white : C.text, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px', maxWidth: '78%', fontSize: 13, lineHeight: 1.55, border: msg.role === 'assistant' ? `1px solid ${C.light}` : 'none', whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: C.dark, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>✳</div>
                  <div style={{ background: C.white, borderRadius: '14px 14px 14px 4px', padding: '10px 14px', fontSize: 13, color: C.muted, border: `1px solid ${C.light}` }}>Escribiendo...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '6px 14px', overflowX: 'auto', display: 'flex', gap: 7, borderTop: `1px solid ${C.light}` }}>
              {['¿Cuáles son los horarios del spa?', '¿A qué hora es el check-out?', '¿Qué hay en la terraza?', 'Recomiéndame qué hacer en Medellín'].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q)} style={{ background: C.white, border: `1px solid ${C.light}`, borderRadius: 20, padding: '5px 11px', cursor: 'pointer', fontSize: 10, color: C.dark, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{ padding: '10px 16px 14px', background: C.bg, display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="¿En qué te puedo ayudar?"
                style={{ flex: 1, padding: '11px 14px', border: `1px solid ${C.light}`, borderRadius: 24, fontSize: 13, outline: 'none', background: C.white, fontFamily: 'var(--font-body)', color: C.text }} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ background: chatInput.trim() && !chatLoading ? C.dark : C.light, color: C.white, border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✳</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.light}; border-radius: 10px; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
