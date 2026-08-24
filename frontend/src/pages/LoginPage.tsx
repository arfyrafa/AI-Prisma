import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionExpired = localStorage.getItem('prisma_session_expired_notice') === 'true'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Harap masukkan email dan kata sandi.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await login(email, password)
      if (res.success) {
        navigate('/', { replace: true })
      } else {
        setError(res.message || 'Email atau kata sandi tidak valid.')
      }
    } catch {
      setError('Terjadi kesalahan koneksi saat login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Branding header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center gap-3">
            <img
              src="/assets/img/logo only prisma.png"
              alt="PRISMA AI Icon"
              className="h-12 w-auto object-contain filter drop-shadow-[0_0_18px_rgba(56,189,248,0.45)] transition-transform hover:scale-105"
            />
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-wider text-white">
                PRISMA
              </span>
              <span className="text-xl font-extrabold text-sky-400 bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 rounded-lg shadow-inner">
                AI
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Industrial Decision Support Platform
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sistem pemantauan &amp; prediksi realtime proses industri ClO₂. Silakan masuk sesuai hak akses akun Anda.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {sessionExpired && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300 font-medium leading-relaxed flex items-center gap-2.5">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>Sesi Anda telah berakhir setelah 1 jam demi keamanan sistem. Silakan masuk kembali.</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-medium leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="email">
                Email Akun / ID
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@prisma.ai"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300" htmlFor="password">
                  Kata Sandi
                </label>
                <span className="text-[11px] text-sky-400 hover:underline cursor-pointer">
                  Lupa sandi?
                </span>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-400"
                />
                <span>Ingat Sesi Login</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-sky-500 bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-500 hover:to-blue-500 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? 'Memverifikasi Kredensial…' : 'Masuk ke Dashboard'}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>PRISMA AI v1.0.0 · Secure Industrial Access</p>
        </div>
      </div>
    </div>
  )
}
