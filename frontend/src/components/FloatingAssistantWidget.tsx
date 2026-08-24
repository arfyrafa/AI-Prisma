import {
 Bot,
 Check,
 ChevronDown,
 Copy,
 Maximize2,
 Minimize2,
 Send,
 Sparkles,
 Trash2,
 X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useProcessContext } from '../hooks/useProcessContext'
import { api, isAgentUnavailable } from '../services/api'
import type { ChatMessage } from '../types'
import { formatClock } from '../utils/format'

const QUICK_SUGGESTIONS = [
 'Bagaimana kondisi ClO₂ saat ini?',
 'Apa rekomendasi jika ClO₂ > 9.80 g/L?',
 'Jelaskan pengaruh HCl Feed (X4) ke produk',
 'Apa SOP saat suhu generator naik > 47°C?',
]

interface Bubble extends ChatMessage {
 at: Date
 source?: string
}

function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }) {
 const lines = content.split('\n')

 return (
 <div className="space-y-1 leading-relaxed">
 {lines.map((line, lineIdx) => {
 if (!line.trim()) {
 return <div key={lineIdx} className="h-1.5" />
 }

 const parts = line.split(/(\*\*[^*]+\*\*)/g)

 return (
 <p key={lineIdx} className={`${line.startsWith('•') || line.startsWith('-') ? 'pl-1.5' : ''}`}>
 {parts.map((part, partIdx) => {
 if (part.startsWith('**') && part.endsWith('**')) {
 const boldText = part.slice(2, -2)
 return (
 <strong
 key={partIdx}
 className={`font-semibold ${isUser ? 'text-white' : 'text-slate-900'}`}
 >
 {boldText}
 </strong>
 )
 }
 return <span key={partIdx}>{part}</span>
 })}
 </p>
 )
 })}
 </div>
 )
}

export function FloatingAssistantWidget() {
 const { processId, health } = useProcessContext()
 const [isOpen, setIsOpen] = useState(false)
 const [isExpanded, setIsExpanded] = useState(false)
 const [messages, setMessages] = useState<Bubble[]>([
 {
 role: 'assistant',
 content:
 'Halo Bapak! Saya Asisten AI OpenClaw untuk unit produksi ClO₂. Ada kondisi proses atau parameter yang ingin dianalisis bersama?',
 at: new Date(),
 },
 ])
 const [input, setInput] = useState('')
 const [sending, setSending] = useState(false)
 const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
 const chatEndRef = useRef<HTMLDivElement | null>(null)
 const inputRef = useRef<HTMLInputElement | null>(null)

 useEffect(() => {
 if (isOpen) {
 chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 inputRef.current?.focus()
 }
 }, [isOpen, messages, sending])

 const handleSend = async (textToSend?: string) => {
 const question = (textToSend ?? input).trim()
 if (!question || sending) return

 const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }))
 setMessages((prev) => [...prev, { role: 'user', content: question, at: new Date() }])
 if (!textToSend) setInput('')
 setSending(true)

 try {
 const response = await api.chat(processId, question, history)
 setMessages((prev) => [
 ...prev,
 {
 role: 'assistant',
 content: response.reply,
 at: new Date(response.timestamp),
 source: response.source,
 },
 ])
 } catch (err) {
 if (isAgentUnavailable(err)) {
 setMessages((prev) => [
 ...prev,
 {
 role: 'assistant',
 content: 'AI Agent sedang offline atau tidak dapat dijangkau saat ini.',
 at: new Date(),
 },
 ])
 } else {
 setMessages((prev) => [
 ...prev,
 {
 role: 'assistant',
 content: 'Mohon maaf Bapak, terjadi kendala saat menghubungkan ke sistem analisis. Silakan coba kembali sesaat lagi.',
 at: new Date(),
 },
 ])
 }
 } finally {
 setSending(false)
 }
 }

 const handleCopy = (content: string, index: number) => {
 void navigator.clipboard.writeText(content)
 setCopiedIndex(index)
 setTimeout(() => setCopiedIndex(null), 2000)
 }

 const handleClear = () => {
 setMessages([
 {
 role: 'assistant',
 content: 'Percakapan telah direset. Silakan ajukan pertanyaan seputar operasi ClO₂.',
 at: new Date(),
 },
 ])
 }

 return (
 <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
 {/* Floating Chat Popup Window */}
 {isOpen && (
 <div
 className={`mb-4 flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${
 isExpanded
 ? 'h-[85vh] w-[90vw] max-w-3xl sm:w-[650px]'
 : 'h-[540px] w-[92vw] max-w-sm sm:w-[420px]'
 }`}
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-4 py-3.5 text-white">
 <div className="flex items-center gap-3">
 <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/30 shadow-inner">
 <img
 src="/assets/img/logo only prisma.png"
 alt="PRISMA AI"
 className="h-6 w-6 object-contain drop-shadow"
 />
 <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <h3 className="text-xs font-bold text-white">PRISMA AI Assistant</h3>
 <span className="rounded bg-sky-500/30 px-1 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-sky-300 border border-sky-400/20">
 OpenClaw
 </span>
 </div>
 <p className="text-[10px] text-slate-300 flex items-center gap-1">
 <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
 {health?.agent_available ? 'Online & Siap Analisis' : 'Offline'}
 </p>
 </div>
 </div>

 {/* Window Controls */}
 <div className="flex items-center gap-1 text-slate-300">
 <button
 type="button"
 onClick={handleClear}
 title="Bersihkan Percakapan"
 className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 <button
 type="button"
 onClick={() => setIsExpanded(!isExpanded)}
 title={isExpanded ? 'Kecilkan Window' : 'Perbesar Window'}
 className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors hidden sm:block"
 >
 {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
 </button>
 <button
 type="button"
 onClick={() => setIsOpen(false)}
 title="Tutup Chat"
 className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </div>

 {/* Chat Message Stream */}
 <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs">
 {messages.map((msg, idx) => (
 <div
 key={idx}
 className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 {msg.role === 'assistant' && (
 <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 border border-sky-200 text-sky-600 shadow-xs">
 <Bot className="h-4 w-4" />
 </div>
 )}

 <div
 className={`group relative max-w-[84%] rounded-2xl px-4 py-3 shadow-xs ${
 msg.role === 'user'
 ? 'bg-sky-600 text-white rounded-br-xs'
 : 'border border-slate-200/80 bg-slate-50/90 text-slate-800 rounded-bl-xs leading-relaxed'
 }`}
 >
 <FormattedMessage content={msg.content} isUser={msg.role === 'user'} />

 <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] opacity-70">
 <span>{formatClock(msg.at)}</span>
 {msg.role === 'assistant' && (
 <button
 type="button"
 onClick={() => handleCopy(msg.content, idx)}
 className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 hover:text-sky-600"
 title="Salin jawaban"
 >
 {copiedIndex === idx ? (
 <>
 <Check className="h-2.5 w-2.5 text-emerald-500" />
 <span className="text-emerald-500 font-bold">Tersalin</span>
 </>
 ) : (
 <>
 <Copy className="h-2.5 w-2.5" />
 <span>Salin</span>
 </>
 )}
 </button>
 )}
 </div>
 </div>
 </div>
 ))}

 {/* Typing Indicator */}
 {sending && (
 <div className="flex items-center gap-2.5 text-slate-400">
 <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 border border-sky-200 text-sky-600">
 <Bot className="h-4 w-4 animate-spin" />
 </div>
 <div className="rounded-2xl rounded-bl-xs border border-slate-200/80 bg-slate-50 px-4 py-2.5 shadow-xs">
 <div className="flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }} />
 <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }} />
 <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '300ms' }} />
 </div>
 </div>
 </div>
 )}
 <div ref={chatEndRef} />
 </div>

 {/* Quick Suggestions Chips */}
 <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2">
 <p className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
 <Sparkles className="h-3 w-3 text-sky-500" />
 Saran pertanyaan cepat:
 </p>
 <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
 {QUICK_SUGGESTIONS.map((sug, i) => (
 <button
 key={i}
 type="button"
 onClick={() => handleSend(sug)}
 disabled={sending}
 className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600:text-sky-400 transition-colors shadow-2xs"
 >
 {sug}
 </button>
 ))}
 </div>
 </div>

 {/* Input Box */}
 <form
 onSubmit={(e) => {
 e.preventDefault()
 handleSend()
 }}
 className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
 >
 <input
 ref={inputRef}
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Ketik pertanyaan untuk OpenClaw AI…"
 disabled={sending}
 className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
 />
 <button
 type="submit"
 disabled={!input.trim() || sending}
 className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-all shadow-xs shrink-0"
 >
 <Send className="h-4 w-4" />
 </button>
 </form>
 </div>
 )}

 {/* Floating Action Button (FAB) */}
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-600 text-white shadow-[0_8px_25px_rgba(14,165,233,0.45)] hover:scale-105 hover:shadow-[0_12px_30px_rgba(14,165,233,0.6)] transition-all duration-300 active:scale-95"
 >
 {isOpen ? (
 <ChevronDown className="h-6 w-6 transition-transform duration-300" />
 ) : (
 <>
 <div className="relative flex items-center justify-center">
 <Bot className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
 <span className="absolute -top-1 -right-1 flex h-3 w-3">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
 <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
 </span>
 </div>
 {/* Tooltip on hover */}
 <span className="absolute right-16 whitespace-nowrap rounded-xl bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 border border-slate-700">
 Tanya OpenClaw AI
 </span>
 </>
 )}
 </button>
 </div>
 )
}
