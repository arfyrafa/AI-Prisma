import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../services/api'

export type UserRole = 'Admin' | 'Operator'

export interface UserProfile {
  id: string
  name: string
  email: string
  password?: string
  role: UserRole
  department: string
  engineerId: string
  isActive: boolean
  avatarUrl?: string
  createdAt?: string
}

interface AuthContextType {
  user: UserProfile | null
  users: UserProfile[]
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  updateProfile: (updated: Partial<UserProfile>) => void
  addUser: (newUser: Omit<UserProfile, 'id' | 'createdAt'>) => Promise<boolean>
  updateUser: (id: string, updated: Partial<UserProfile>) => Promise<void>
  deleteUser: (id: string) => Promise<boolean>
  toggleUserStatus: (id: string) => Promise<void>
}

const DEFAULT_USERS_SEED: UserProfile[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    email: 'admin@prisma.ai',
    password: 'admin123',
    role: 'Admin',
    department: 'Kepala Operasi & Chemical Plant',
    engineerId: 'ENG-ADM-001',
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: '2',
    name: 'Budi Santoso',
    email: 'operator@prisma.ai',
    password: 'operator123',
    role: 'Operator',
    department: 'Operator Shift A - ClO₂ Unit',
    engineerId: 'OPR-2026-102',
    isActive: true,
    createdAt: '2026-02-10T09:30:00Z',
  },
  {
    id: '3',
    name: 'Luqman Hakim',
    email: 'luqman@prisma.ai',
    password: 'luqman123',
    role: 'Operator',
    department: 'Process Engineering Specialist',
    engineerId: 'ENG-CLO2-77',
    isActive: true,
    createdAt: '2026-03-01T10:15:00Z',
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>(DEFAULT_USERS_SEED)

  // Current logged in session
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('prisma_user_session')
    if (saved) {
      try {
        return JSON.parse(saved) as UserProfile
      } catch {
        return DEFAULT_USERS_SEED[0]
      }
    }
    return DEFAULT_USERS_SEED[0]
  })

  // Sync users from backend DB
  const loadDbUsers = async () => {
    try {
      const dbUsers = await api.listDbUsers()
      if (Array.isArray(dbUsers) && dbUsers.length > 0) {
        const mapped: UserProfile[] = dbUsers.map((u: any) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role as UserRole,
          department: u.department,
          engineerId: u.engineer_id,
          isActive: u.is_active,
          createdAt: u.created_at,
        }))
        setUsers(mapped)
      }
    } catch {
      // Keep local state if backend is offline
    }
  }

  useEffect(() => {
    loadDbUsers()
  }, [])

  // Persist active session
  useEffect(() => {
    if (user) {
      localStorage.setItem('prisma_user_session', JSON.stringify(user))
    } else {
      localStorage.removeItem('prisma_user_session')
    }
  }, [user])

  const login = async (emailInput: string, passInput: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase()

    try {
      const res = await api.login(cleanEmail, passInput)
      if (res && res.user) {
        const loggedUser: UserProfile = {
          id: String(res.user.id),
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as UserRole,
          department: res.user.department,
          engineerId: res.user.engineer_id,
          isActive: res.user.is_active,
          createdAt: res.user.created_at,
        }
        setUser(loggedUser)
        return { success: true }
      }
    } catch (err: any) {
      // If error from backend API
      if (err?.message) {
        return { success: false, message: err.message }
      }
    }

    // Fallback to local user check if backend is starting
    const foundUser = users.find((u) => u.email.toLowerCase() === cleanEmail)
    if (!foundUser) {
      return { success: false, message: 'Akun dengan email tersebut tidak ditemukan.' }
    }
    if (!foundUser.isActive) {
      return { success: false, message: 'Akun ini telah dinonaktifkan oleh Administrator.' }
    }
    if (foundUser.password && foundUser.password !== passInput) {
      return { success: false, message: 'Kata sandi yang Anda masukkan salah.' }
    }

    setUser(foundUser)
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('prisma_user_session')
  }

  const updateProfile = (updated: Partial<UserProfile>) => {
    if (!user) return
    const updatedUser = { ...user, ...updated }
    setUser(updatedUser)
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)))

    // Sync to backend DB
    api.updateDbUser(user.id, {
      name: updated.name,
      email: updated.email,
      department: updated.department,
      engineer_id: updated.engineerId,
    }).catch(() => {})
  }

  const addUser = async (newUser: Omit<UserProfile, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const created = await api.createDbUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUserRoleMapper(newUser.role),
        department: newUser.department,
        engineer_id: newUser.engineerId,
        is_active: newUser.isActive,
      })
      if (created) {
        await loadDbUsers()
        return true
      }
    } catch {
      // local fallback
    }

    const emailExists = users.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())
    if (emailExists) return false

    const createdLocal: UserProfile = {
      ...newUser,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, createdLocal])
    return true
  }

  const updateUser = async (id: string, updated: Partial<UserProfile>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)))
    if (user?.id === id) {
      setUser((prev) => (prev ? { ...prev, ...updated } : null))
    }

    try {
      await api.updateDbUser(id, {
        name: updated.name,
        email: updated.email,
        password: updated.password,
        role: updated.role,
        department: updated.department,
        engineer_id: updated.engineerId,
        is_active: updated.isActive,
      })
    } catch {
      // ignore
    }
  }

  const deleteUser = async (id: string): Promise<boolean> => {
    if (user?.id === id) return false
    setUsers((prev) => prev.filter((u) => u.id !== id))
    try {
      await api.deleteDbUser(id)
    } catch {
      // ignore
    }
    return true
  }

  const toggleUserStatus = async (id: string) => {
    if (user?.id === id) return
    const target = users.find((u) => u.id === id)
    if (!target) return

    const nextStatus = !target.isActive
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: nextStatus } : u))
    )

    try {
      await api.updateDbUser(id, { is_active: nextStatus })
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'Admin',
        login,
        logout,
        updateProfile,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function newUserRoleMapper(role: UserRole): string {
  return role === 'Admin' ? 'Admin' : 'Operator'
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
