import { useEffect, useRef, useState } from 'react'

import { Panel } from '../components/Panel'
import { AgentUnavailableState } from '../components/StateViews'
import { useProcessContext } from '../hooks/useProcessContext'
import { api, isAgentUnavailable } from '../services/api'
import type { ChatMessage } from '../types'
import { formatClock } from '../utils/format'

const SUGGESTIONS = [
  'Kenapa konsentrasi ClO₂ saat ini tinggi?',
  'Parameter apa saja yang berada di luar target?',
  'Apa yang berubah pada data terakhir?',
  'Apa isi SOP untuk kondisi ini?',
]

interface Bubble extends ChatMessage {
  at: Date
  source?: string
}

export function AssistantPage() {
  const { processId, health } = useProcessContext()
  const [messages, setMessages] = useState<Bubble[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [agentDown, setAgentDown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || sending) return

    const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }))
    setMessages((prev) => [...prev, { role: 'user', content: question, at: new Date() }])
    setInput('')
    setSending(true)
    setAgentDown(false)
    setError(null)

    try {
      const response = await api.chat(processId, question, history)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.reply, at: new Date(response.timestamp), source: response.source },
      ])
    } catch (err) {
      // The assistant never invents an answer when the agent is down.
      if (isAgentUnavailable(err)) setAgentDown(true)
      else setError(err instanceof Error ? err.message : 'Pesan gagal dikirim.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="AI Assistant"
        title="Tanya kondisi proses"
        action={
          <span className="text-xs text-ink-muted">
            Provider: <span className="font-mono text-ink">{health?.agent_provider ?? '—'}</span> ·{' '}
            {health?.agent_available ? 'tersedia' : 'tidak tersedia'}
          </span>
        }
        bodyClassName="p-0"
      >
        <div className="h-[420px] space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !agentDown && (
            <div className="rounded border border-line bg-canvas px-4 py-3">
              <p className="text-sm text-ink">
                Ajukan pertanyaan tentang kondisi proses saat ini. Jawaban disusun dari data proses,
                rentang operasi, dan dokumen Knowledge Base — bukan dari asumsi.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex items-start gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <img
                  src="/assets/img/logo only prisma.png"
                  alt="PRISMA AI Avatar"
                  className="mt-0.5 h-6 w-6 rounded shrink-0 object-contain drop-shadow"
                />
              )}
              <div
                className={`max-w-[85%] rounded px-3.5 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-brand text-white'
                    : 'border border-line bg-surface text-ink'
                }`}
              >
                <p className="whitespace-pre-line text-sm leading-relaxed">{message.content}</p>
                <p
                  className={`mt-1.5 text-[11px] ${
                    message.role === 'user' ? 'text-white/70' : 'text-ink-faint'
                  }`}
                >
                  {formatClock(message.at)}
                  {message.source ? ` · ${message.source}` : ''}
                </p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-muted">
                Menyusun jawaban…
              </div>
            </div>
          )}

          {agentDown && <AgentUnavailableState />}
          {error && <p className="text-sm text-state-critical">{error}</p>}

          <div ref={endRef} />
        </div>

        <div className="border-t border-line px-4 py-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded border border-line bg-canvas px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
                onClick={() => void send(suggestion)}
                disabled={sending}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Tulis pertanyaan…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void send(input)
              }}
              aria-label="Pertanyaan untuk AI Assistant"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => void send(input)}
              disabled={sending || input.trim().length === 0}
            >
              Kirim
            </button>
          </div>
        </div>
      </Panel>

      <p className="text-xs text-ink-faint">
        AI Assistant bersifat pendukung keputusan. Setiap tindakan operasional tetap memerlukan
        verifikasi engineer dan mengacu pada prosedur yang berlaku.
      </p>
    </div>
  )
}
