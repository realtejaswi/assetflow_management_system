import React, { createContext, useContext, useState, useEffect } from 'react'
import bankApi from '../api/bankApi'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('bank_access_token')
    if (token) {
      bankApi.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch(() => { sessionStorage.removeItem('bank_access_token'); sessionStorage.removeItem('bank_refresh_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await bankApi.post('/auth/login', { email, password })
    sessionStorage.setItem('bank_access_token', data.access_token)
    sessionStorage.setItem('bank_refresh_token', data.refresh_token)
    setUser(data.user)
  }

  const register = async (formData) => {
    await bankApi.post('/auth/register', formData)
  }

  const logout = () => {
    sessionStorage.removeItem('bank_access_token')
    sessionStorage.removeItem('bank_refresh_token')
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
