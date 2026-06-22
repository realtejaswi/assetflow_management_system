import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import bankApi from '../api/bankApi'

interface User {
  id: string
  full_name: string
  email: string
  phone: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bank_access_token')
    if (token) {
      bankApi.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => { localStorage.removeItem('bank_access_token'); localStorage.removeItem('bank_refresh_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await bankApi.post('/auth/login', { email, password })
    localStorage.setItem('bank_access_token', data.access_token)
    localStorage.setItem('bank_refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const register = async (formData: any) => {
    const { data } = await bankApi.post('/auth/register', formData)
    localStorage.setItem('bank_access_token', data.access_token)
    localStorage.setItem('bank_refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('bank_access_token')
    localStorage.removeItem('bank_refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
