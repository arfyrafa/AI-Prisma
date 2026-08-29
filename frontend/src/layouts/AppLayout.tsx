import {
  Activity,
  BookOpen,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Sliders,
  Sparkles,
  TrendingUp,
  User,
  UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FloatingAssistantWidget } from '../components/FloatingAssistantWidget'
import { NotificationPopover } from '../components/NotificationPopover'
import { StatusPill } from '../components/StatusPill'
import { useAuth } from '../context/AuthContext'
import { useProcessContext } from '../hooks/useProcessContext'
import { formatRelative } from '../utils/format'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monitor', label: 'Monitor Proses', icon: Activity },
  { to: '/parameters', label: 'Konfigurasi Parameter', icon: Sliders },
  { to: '/predictions', label: 'Prediksi', icon: TrendingUp },
  { to: '/insights', label: 'Insight AI', icon: Sparkles },
  { to: '/recommendations', label: 'Rekomendasi', icon: Lightbulb },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { to: '/settings', label: 'Profil & Akun', icon: UserCog },
]

const MODE_LABELS: Record<string, string> = {
  websocket: 'Real-time (WebSocket)',
  polling: 'Polling 5 detik',
  offline: 'Terputus',
}

export function AppLayout() {
  const { snapshot, health, mode, lastEventAt, error } = useProcessContext()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const simulation = health !== null && health !== undefined ? health.simulation_mode : snapshot?.data_source === 'simulation'
  const online = mode !== 'offline' && !error

  return (
    <div className="flex min-h-screen bg-canvas text-slate-900 transition-colors">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-slate-950 text-white transition-transform duration-300 ease-in-out border-r border-slate-800/80 lg:static lg:translate-x-0 ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5 bg-slate-950/80">
          <img
            src="/assets/img/logo only prisma.png"
            alt="PRISMA AI Logo"
            className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] transition-transform hover:scale-105"
          />
          <div>
            <p className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
              PRISMA <span className="text-sky-400 text-xs font-bold px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/30">AI</span>
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Decision Support
            </p>
          </div>
        </div>

        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 ${isActive
                        ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-sky-300 font-semibold border-l-4 border-sky-400 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-800/80 bg-slate-950/60 px-5 py-3.5 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300">Studi kasus: Produksi ClO₂</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Human-in-the-loop · tanpa kontrol otomatis</p>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-xs transition-colors">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-ghost px-2 lg:hidden text-slate-700"
                onClick={() => setMenuOpen(true)}
                aria-label="Buka menu"
              >
                ☰
              </button>
              <img
                src="/assets/img/logo only prisma.png"
                alt="PRISMA AI Icon"
                className="h-8 w-8 object-contain hidden sm:block drop-shadow-sm"
              />
              <div>
                <p className="eyebrow">Proses aktif</p>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  {snapshot?.process.name ?? 'Proses Produksi ClO₂'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="hidden text-right xl:block">
                <p className="eyebrow">Pembaruan terakhir</p>
                <p className="text-xs font-medium text-slate-600">
                  {formatRelative(snapshot?.reading?.timestamp ?? lastEventAt)}
                </p>
              </div>

              {/* Real-time Status Badge */}
              <div
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 ${online
                    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                />
                <span className="text-xs font-semibold">
                  {online ? 'Sistem online' : 'Sistem terputus'}
                </span>
                <span className="hidden text-[10px] opacity-75 font-mono md:inline">
                  · {MODE_LABELS[mode]}
                </span>
              </div>

              {/* Notification Popover */}
              <NotificationPopover />

              {/* User Profile Dropdown Menu */}
              <div className="relative border-l border-slate-200 pl-2.5">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-black text-white shadow-sm">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'EG'}
                  </div>
                  <div className="hidden text-left md:block leading-tight pr-1">
                    <p className="text-xs font-bold text-slate-800">{user?.name ?? 'Engineer'}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{user?.role ?? 'Process Engineer'}</p>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      Profil &amp; Pengaturan
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-500" />
                      Keluar (Logout)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {simulation && (
            <div className="flex flex-wrap items-center gap-2 border-t border-amber-200/60 bg-amber-50/80 px-4 py-1.5 lg:px-6">
              <StatusPill status="warning" label="Simulation Mode" />
              <p className="text-xs font-medium text-amber-900">
                Data proses dihasilkan simulator untuk keperluan demo — bukan data produksi nyata.
              </p>
            </div>
          )}
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>

        {/* Global Floating AI Assistant Widget */}
        <FloatingAssistantWidget />
      </div>
    </div>
  )
}
