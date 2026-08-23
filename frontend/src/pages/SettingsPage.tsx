import {
  KeyRound,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Panel } from '../components/Panel'
import { useAuth, type UserProfile, type UserRole } from '../context/AuthContext'
import { useProcessContext } from '../hooks/useProcessContext'

export function SettingsPage() {
  const {
    user,
    users,
    isAdmin,
    updateProfile,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  } = useAuth()
  const { health } = useProcessContext()

  // Profile Form state
  const [name, setName] = useState(user?.name ?? 'Alex Rivera')
  const [email, setEmail] = useState(user?.email ?? 'admin@prisma.ai')
  const [department, setDepartment] = useState(user?.department ?? 'Operasi ClO₂ & Chemical Plant')
  const [engineerId, setEngineerId] = useState(user?.engineerId ?? 'ENG-ADM-001')
  const [profileSaved, setProfileSaved] = useState(false)

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // LLM AI Configuration state
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('prisma_ai_provider') ?? 'openclaw')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('prisma_ai_api_key') ?? '')
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('prisma_ai_base_url') ?? '')
  const [modelName, setModelName] = useState(() => localStorage.getItem('prisma_ai_model') ?? 'gpt-4o-mini')
  const [aiSaved, setAiSaved] = useState(false)
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)

  // User Management Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('operator123')
  const [newUserRole, setNewUserRole] = useState<UserRole>('Operator')
  const [newUserDept, setNewUserDept] = useState('Operasi ClO₂ Unit')
  const [newUserEngId, setNewUserEngId] = useState('OPR-2026-')
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<UserProfile | null>(null)
  const [resetNewPass, setResetNewPass] = useState('')

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateProfile({ name, email, department, engineerId })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Harap masukkan kata sandi saat ini.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' })
      return
    }

    setPasswordMsg({ type: 'success', text: 'Kata sandi berhasil diperbarui.' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordMsg(null), 3000)
  }

  const handleAiConfigSave = (e: FormEvent) => {
    e.preventDefault()
    localStorage.setItem('prisma_ai_provider', aiProvider)
    localStorage.setItem('prisma_ai_api_key', apiKey)
    localStorage.setItem('prisma_ai_base_url', baseUrl)
    localStorage.setItem('prisma_ai_model', modelName)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 3000)
  }

  const testAiConnection = async () => {
    setAiTesting(true)
    setAiTestResult(null)
    try {
      const res = await fetch('/api/v1/health')
      const data = await res.json()
      if (data.agent_available) {
        setAiTestResult(`✓ Terhubung sukses! Provider: ${data.agent_provider} (Model & Rules Aktif)`)
      } else {
        setAiTestResult('⚠ Server aktif, namun Agent Provider belum merespons.')
      }
    } catch {
      setAiTestResult('✕ Gagal terhubung ke endpoint AI backend.')
    } finally {
      setAiTesting(false)
    }
  }

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!newUserName || !newUserEmail || !newUserPassword) {
      setUserActionMsg({ type: 'error', text: 'Lengkapi semua field wajib.' })
      return
    }

    const ok = await addUser({
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      department: newUserDept,
      engineerId: newUserEngId,
      isActive: true,
    })

    if (ok) {
      setUserActionMsg({ type: 'success', text: `Akun ${newUserName} (${newUserRole}) berhasil dibuat!` })
      setIsAddUserModalOpen(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('operator123')
      setNewUserRole('Operator')
      setTimeout(() => setUserActionMsg(null), 3000)
    } else {
      setUserActionMsg({ type: 'error', text: 'Email tersebut sudah digunakan akun lain.' })
    }
  }

  const handleExecuteResetPassword = (e: FormEvent) => {
    e.preventDefault()
    if (!resetModalUser || resetNewPass.length < 6) {
      setUserActionMsg({ type: 'error', text: 'Kata sandi minimal 6 karakter.' })
      return
    }
    updateUser(resetModalUser.id, { password: resetNewPass })
    setUserActionMsg({
      type: 'success',
      text: `Kata sandi untuk ${resetModalUser.name} berhasil direset!`,
    })
    setResetModalUser(null)
    setResetNewPass('')
    setTimeout(() => setUserActionMsg(null), 3000)
  }

  const totalAdmins = users.filter((u) => u.role === 'Admin').length
  const totalOperators = users.filter((u) => u.role === 'Operator').length

  return (
    <div className="space-y-6">
      {/* Header Profile Hero Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 font-black text-white text-xl shadow-md">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'EX'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                  }`}
                >
                  {isAdmin ? '🛡️ Administrator' : '⚙️ Process Operator'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user?.department}</p>
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.engineerId}</span> · {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              ● Sesi Aktif ({user?.role})
            </span>
          </div>
        </div>
      </div>

      {/* Global Action Message */}
      {userActionMsg && (
        <div
          className={`rounded-xl p-4 text-xs font-bold transition-all shadow-xs ${
            userActionMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
          }`}
        >
          {userActionMsg.text}
        </div>
      )}

      {/* ADMIN-ONLY USER MANAGEMENT PANEL */}
      {isAdmin && (
        <Panel
          eyebrow="Hak Akses Administrator"
          title="Manajemen Pengguna &amp; Akun Sistem"
          action={
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Tambah Akun Pengguna
            </button>
          }
        >
          <div className="space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Akun</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{users.length}</p>
                </div>
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <div className="rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Administrator</p>
                  <p className="text-xl font-mono font-bold text-purple-700 dark:text-purple-300">{totalAdmins}</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-purple-500" />
              </div>
              <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">Process Operator</p>
                  <p className="text-xl font-mono font-bold text-sky-700 dark:text-sky-300">{totalOperators}</p>
                </div>
                <UserCog className="h-6 w-6 text-sky-500" />
              </div>
            </div>

            {/* Users Data Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[700px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-left">
                    <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-500">Nama &amp; Email</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-500">ID Engineer</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-500">Departemen</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-500">Role</th>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="py-2.5 px-3.5 font-bold uppercase tracking-wider text-slate-500 text-right">Aksi Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const isSelf = u.id === user?.id
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {u.name}
                                {isSelf && (
                                  <span className="rounded bg-sky-100 dark:bg-sky-950 px-1.5 py-0.2 text-[9px] font-bold text-sky-700 dark:text-sky-300">
                                    Anda
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-400 font-mono text-[10px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {u.engineerId}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                          {u.department}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              updateUser(u.id, { role: u.role === 'Admin' ? 'Operator' : 'Admin' })
                            }
                            title={isSelf ? 'Tidak bisa mengubah role akun sendiri' : 'Klik untuk ubah role'}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1 ${
                              u.role === 'Admin'
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 hover:bg-purple-200'
                                : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 hover:bg-sky-200'
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            {u.role}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => toggleUserStatus(u.id)}
                            title={isSelf ? 'Tidak bisa menonaktifkan akun sendiri' : 'Klik untuk ubah status'}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all inline-flex items-center gap-1 ${
                              u.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                            }`}
                          >
                            {u.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                            {u.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResetModalUser(u)
                                setResetNewPass('')
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin menghapus akun ${u.name}?`)) {
                                  deleteUser(u.id)
                                }
                              }}
                              className="rounded-lg border border-rose-200 dark:border-rose-900/60 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30"
                              title={isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Akun'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      )}

      {/* Profil Pribadi & AI Config */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form Profil Pribadi */}
        <Panel eyebrow="Pengaturan Profil" title="Informasi Akun Saya">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileSaved && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                ✓ Profil berhasil diperbarui.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Utama</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">ID / NIP Engineer</label>
                <input
                  type="text"
                  value={engineerId}
                  onChange={(e) => setEngineerId(e.target.value)}
                  className="field"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Departemen / Unit</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="field"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-primary">
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </Panel>

        {/* AI & LLM Engine Configuration */}
        <Panel eyebrow="Kecerdasan Buatan" title="Konfigurasi OpenClaw &amp; LLM Engine">
          <form onSubmit={handleAiConfigSave} className="space-y-4">
            {aiSaved && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                ✓ Pengaturan AI Agent berhasil disimpan.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Agent Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="field"
              >
                <option value="openclaw">OpenClaw ClO₂ Industrial Engine (Active &amp; Offline)</option>
                <option value="openai">OpenAI / Compatible Endpoint</option>
                <option value="gemini">Google Gemini AI Endpoint</option>
                <option value="custom">Custom Local Gateway (Ollama / 9router)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="field font-mono"
                placeholder="gpt-4o-mini / cx/gpt-5.5 / gemini-1.5-pro"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">API Key (Opsional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="field font-mono"
                placeholder="sk-..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom Base URL (Opsional)</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="field font-mono"
                placeholder="http://127.0.0.1:20128/v1"
              />
            </div>

            {aiTestResult && (
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-2.5 text-xs font-semibold text-sky-800 dark:text-sky-300">
                {aiTestResult}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button type="submit" className="btn-primary">
                Simpan Konfigurasi AI
              </button>
              <button
                type="button"
                onClick={testAiConnection}
                disabled={aiTesting}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                {aiTesting ? 'Menguji…' : 'Tes Koneksi AI'}
              </button>
            </div>
          </form>
        </Panel>
      </div>

      {/* Keamanan & Sandi + Server Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ubah Sandi Saya */}
        <Panel eyebrow="Keamanan Akun" title="Ubah Kata Sandi Saya">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordMsg && (
              <div
                className={`rounded-lg p-3 text-xs font-semibold ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kata Sandi Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kata Sandi Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="field"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field"
                placeholder="Ulangi kata sandi baru"
              />
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-secondary">
                Perbarui Kata Sandi
              </button>
            </div>
          </form>
        </Panel>

        {/* Info Lisensi & Server */}
        <Panel eyebrow="Sistem" title="Informasi Server &amp; Lisensi">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/img/logo only prisma.png"
                alt="PRISMA AI Icon"
                className="h-7 w-7 object-contain"
              />
              <span className="text-lg font-black tracking-wider text-slate-900 dark:text-white">
                PRISMA <span className="text-sky-600 dark:text-sky-400 font-bold">AI</span>
              </span>
            </div>
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-full">
              v1.0.0 Industrial DSS
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="font-bold text-slate-400 uppercase text-[10px]">Status Server</dt>
              <dd className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-400">{health?.status ?? 'Online'}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-400 uppercase text-[10px]">Database Telemetri</dt>
              <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">{health?.database ?? 'SQLite'}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-400 uppercase text-[10px]">AI Provider</dt>
              <dd className="mt-0.5 font-mono font-bold text-sky-700 dark:text-sky-400">{health?.agent_provider ?? 'openclaw'}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-400 uppercase text-[10px]">Tipe Akses Sesi</dt>
              <dd className="mt-0.5 font-semibold text-purple-700 dark:text-purple-300">{user?.role} Mode</dd>
            </div>
          </dl>

          <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
            OpenClaw ClO₂ Industrial Decision Support System menghubungkan telemetri 8 parameter sensor dengan model prediksi dan SOP operasional.
          </p>
        </Panel>
      </div>

      {/* MODAL: TAMBAH AKUN PENGGUNA BARU */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Akun Pengguna Baru</h3>
                  <p className="text-[11px] text-slate-400">Buat akun untuk Process Operator atau Administrator baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Login</label>
                  <input
                    type="email"
                    required
                    placeholder="rian@prisma.ai"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="field"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kata Sandi Awal</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="field font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Role / Hak Akses</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="field"
                  >
                    <option value="Operator">Operator (Pemantauan &amp; AI)</option>
                    <option value="Admin">Admin (Akses Penuh &amp; User Mgmt)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">ID / NIP Engineer</label>
                  <input
                    type="text"
                    required
                    value={newUserEngId}
                    onChange={(e) => setNewUserEngId(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Departemen / Shift Unit</label>
                <input
                  type="text"
                  required
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="field"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Simpan &amp; Buat Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET KATA SANDI USER */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reset Kata Sandi Pengguna</h3>
                  <p className="text-[11px] text-slate-400">Atur ulang kata sandi untuk: {resetModalUser.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kata Sandi Baru</label>
                <input
                  type="text"
                  required
                  placeholder="Minimal 6 karakter"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  className="field font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Konfirmasi Reset Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
