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

  c
