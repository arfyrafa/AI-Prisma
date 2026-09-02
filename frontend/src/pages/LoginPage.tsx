import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-sky-600/20 via-blue-600/20 to-purple-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-indigo-600/15 via-sky-600/10 to-transparent blur-[100px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25">
              <img
                src="/assets/img/logo only prisma.png"
                alt="PRISMA AI Logo"
                className="h-7 w-7 object-contain drop-shadow"
              />
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-wider text-white">
                PRISMA <span className="text-sky-400">AI</span>
              </span>
              <p className="text-[11px] font-medium tracking-wide text-slate-400">
                INDUSTRIAL PROCESS OPTIMIZER
              </p>
            </div>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h1 className="text-lg font-bold text-white">Masuk ke Sistem</h1>
            <p className="mt-1 text-xs text-slate-400">
              Gunakan akun resmi untuk mengakses dashboard kendali proses
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {sessionExpired && !error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 font-medium leading-relaxed">
                Sesi Anda telah kedaluwarsa. Silakan login kembali untuk melanjutkan.
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
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-400/30 transition-colors"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
