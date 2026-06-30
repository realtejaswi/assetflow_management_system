import React, { createContext, useContext, useState, useEffect } from 'react'
import { bankApi } from '../api/assetflowApi'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('assetflow_access_token')
      if (token) {
        const { data } = await bankApi.get('/auth/me')
        setUser(data)
        setIsAuthenticated(true)
        localStorage.setItem('assetflow_user_id', data.id)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('assetflow_access_token')
      localStorage.removeItem('assetflow_refresh_token')
      localStorage.removeItem('assetflow_user_id')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (email, password) => {
    const { data } = await bankApi.post('/auth/login', { email, password })
    localStorage.setItem('assetflow_access_token', data.access_token)
    localStorage.setItem('assetflow_refresh_token', data.refresh_token)
    localStorage.setItem('assetflow_user_id', data.user.id)
    setUser(data.user)
    setIsAuthenticated(true)
  }

  const register = async (userData) => {
    await bankApi.post('/auth/register', userData)
  }

  const logout = () => {
    localStorage.removeItem('assetflow_access_token')
    localStorage.removeItem('assetflow_refresh_token')
    localStorage.removeItem('assetflow_user_id')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
