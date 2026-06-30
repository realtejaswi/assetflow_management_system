import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { getAssetflowTheme } from './theme/assetflowTheme'
import AssetFlowLayout from './components/AssetFlowLayout'
import DashboardPage from './pages/DashboardPage'
import TaxDashboardPage from './pages/TaxDashboardPage'
import AIAdvisorPage from './pages/AIAdvisorPage'
import ExpenseAnalyticsPage from './pages/ExpenseAnalyticsPage'
import AssetTrackerPage from './pages/AssetTrackerPage'
import LoanDashboardPage from './pages/LoanDashboardPage'
import CashFlowPage from './pages/CashFlowPage'
import HealthScorePage from './pages/HealthScorePage'
import SettingsPage from './pages/SettingsPage'
import { Box, Typography, CircularProgress } from '@mui/material'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15000, retry: 1 } }
})

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#050B18' }}><CircularProgress /></Box>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}















export const ThemeModeContext = React.createContext({ toggleThemeMode: () => {}, mode: 'dark' })

export default function App() {
  const [mode, setMode] = React.useState(() => {
    const saved = localStorage.getItem('themeMode')
    return saved ? saved : 'dark'
  })

  React.useEffect(() => {
    localStorage.setItem('themeMode', mode)
  }, [mode])

  const themeModeValue = React.useMemo(() => ({
    toggleThemeMode: () => setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light')),
    mode,
  }), [mode])

  const theme = React.useMemo(() => getAssetflowTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={themeModeValue}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Toaster position="top-right" toastOptions={{
              style: { background: '#0C1526', color: '#E2E8F0', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }
            }} />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><AssetFlowLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="expenses" element={<ExpenseAnalyticsPage />} />
                <Route path="assets" element={<AssetTrackerPage />} />
                <Route path="loans" element={<LoanDashboardPage />} />
                <Route path="cashflow" element={<CashFlowPage />} />
                <Route path="tax" element={<TaxDashboardPage />} />
                <Route path="ai-advisor" element={<AIAdvisorPage />} />
                <Route path="health-score" element={<HealthScorePage />} />

                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
    </ThemeModeContext.Provider>
  )
}
