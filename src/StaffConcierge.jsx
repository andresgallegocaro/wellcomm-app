import React, { useState, useRef, useEffect } from 'react'

const SUGGESTED_QUESTIONS = [
  '¿Cuál es el procedimiento de check-in?',
  '¿Qué incluye el menú del Spa?',
  '¿Cuáles son las tarifas actuales por tipo de habitación?',
  '¿Cuál es el protocolo ante una queja de huésped?',
  '¿Quiénes son los proveedores principales del hotel?',
  '¿Cómo funciona el Revenue Management con PricePoint?',
]

export default function StaffConcierge({ onBack, onDashboard }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola! Soy el Concierge IA interno de WELLcomm. Tengo acceso a toda la documentación del hotel en Notion. ¿En qué te puedo ayudar hoy?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    const question = text || input.trim()
    if (!question) return

    setMessages(prev => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, role: 'staff' })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error de conexión. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-text)',
        color: 'white',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'white',
          fontSize: '1.2rem', cursor: 'pointer', padding: '0.25rem'
        }}>←</button>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
            Concierge IA · Equipo
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, letterSpacing: '0.1em' }}>
            WELLCOMM SPA & HOTEL · CONTEXTO NOTION ACTIVO
          </div>
        </div>
        <button onClick={onDashboard} style={{
          marginLeft: 'auto',
          background: 'var(--color-primary)',
          border: 'none',
          borderRadius: '20px',
          color: 'white',
          fontSize: '0.72rem',
          padding: '0.4rem 0.75rem',
          cursor: 'pointer',
          letterSpacing: '0.05em'
        }}>📊 Dashboard</button>
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div style={{ padding: '1rem 1.5rem 0' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            PREGUNTAS FRECUENTES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? 'var(--color-text)' : 'white',
              color: msg.role === 'user' ? 'white' : 'var(--color-text)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              boxShadow: 'var(--shadow)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'white',
              borderRadius: '16px 16px 16px 4px',
              padding: '0.75rem 1rem',
              boxShadow: 'var(--shadow)',
              display: 'flex', gap: '4px', alignItems: 'center'
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--color-primary)',
                  animation: `bounce 1s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'white',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        gap: '0.75rem',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pregunta sobre procedimientos, tarifas, proveedores..."
          style={{
            flex: 1,
            border: '1px solid var(--color-border)',
            borderRadius: '24px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.88rem',
            outline: 'none',
            background: 'var(--color-bg)',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--color-text)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 44, height: 44,
            fontSize: '1.1rem',
            cursor: 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >→</button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
