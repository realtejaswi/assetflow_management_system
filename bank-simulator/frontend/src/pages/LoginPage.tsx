import React, { useState } from 'react'
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Tab, Tabs, Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material'
import { Visibility, VisibilityOff, AccountBalance } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [tab, setTab] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    full_name: '', email: '', phone: '', password: '', role: 'user'
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(loginForm.email, loginForm.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await register(registerForm)
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top left, rgba(0,198,255,0.15) 0%, #0A0F1E 50%, rgba(124,58,237,0.1) 100%)',
      p: 2
    }}>
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: '20px',
            background: 'linear-gradient(135deg, #00C6FF, #0072FF)',
            boxShadow: '0 0 40px rgba(0,198,255,0.4)', mb: 2
          }}>
            <AccountBalance sx={{ fontSize: 36, color: '#000' }} />
          </Box>
          <Typography variant="h4" fontWeight={800} sx={{
            background: 'linear-gradient(135deg, #00C6FF, #7C3AED)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Bank Simulator
          </Typography>
          <Typography color="text.secondary" variant="body2" mt={0.5}>
            Simulate a complete financial ecosystem
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}
              TabIndicatorProps={{ style: { background: 'linear-gradient(90deg, #00C6FF, #0072FF)' } }}>
              <Tab label="Login" sx={{ fontWeight: 600 }} />
              <Tab label="Register" sx={{ fontWeight: 600 }} />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            {tab === 0 ? (
              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Email Address" type="email" fullWidth required
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                />
                <TextField
                  label="Password" fullWidth required
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
                  sx={{ mt: 1, py: 1.5 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                </Button>
                {/* Demo credentials */}
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Demo: admin@bank.com / admin123
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField label="Full Name" fullWidth required
                  value={registerForm.full_name}
                  onChange={e => setRegisterForm({ ...registerForm, full_name: e.target.value })} />
                <TextField label="Email Address" type="email" fullWidth required
                  value={registerForm.email}
                  onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} />
                <TextField label="Phone Number" fullWidth required
                  value={registerForm.phone}
                  onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} />
                <TextField
                  label="Password" fullWidth required
                  type={showPassword ? 'text' : 'password'}
                  value={registerForm.password}
                  onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ py: 1.5 }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
