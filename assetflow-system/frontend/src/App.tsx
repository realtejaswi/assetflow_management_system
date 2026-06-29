import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { assetflowTheme } from './theme/assetflowTheme'
import AssetFlowLayout from './components/AssetFlowLayout'
import DashboardPage from './pages/DashboardPage'
import TaxDashboardPage from './pages/TaxDashboardPage'
import AIAdvisorPage from './pages/AIAdvisorPage'
import { Box, Typography, CircularProgress } from '@mui/material'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15000, retry: 1 } }
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#050B18' }}><CircularProgress /></Box>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Placeholder pages
const ExpensePage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Expense Analytics</Typography>
    <Typography color="text.secondary">Expense charts load from AssetFlow backend. Ensure consumer service is running to see data.</Typography>
  </Box>
)

const AssetTrackerPage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Asset Tracker</Typography>
    <Typography color="text.secondary">Track stocks, mutual funds, gold, and fixed deposits — aggregated from The Bank events.</Typography>
  </Box>
)

const LoanDashboardPage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Loan Dashboard</Typography>
    <Typography color="text.secondary">Outstanding loans and EMI schedules are aggregated from The Bank events.</Typography>
  </Box>
)

const CashFlowPage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Cash Flow Forecasting</Typography>
    <Typography color="text.secondary">30/90/180-day cash flow forecasts using Prophet ML model.</Typography>
  </Box>
)

const HealthScorePage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Financial Health Score</Typography>
    <Typography color="text.secondary">Your financial health score breakdown (0-100).</Typography>
  </Box>
)

const AlertsPage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Alerts</Typography>
    <Typography color="text.secondary">Budget alerts, anomaly detection, and EMI reminders.</Typography>
  </Box>
)

const SettingsPage = () => (
  <Box>
    <Typography variant="h4" fontWeight={800} mb={2}>Settings</Typography>
    <Typography color="text.secondary">Configure AssetFlow preferences and connected bank accounts.</Typography>
  </Box>
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={assetflowTheme}>
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
                <Route path="expenses" element={<ExpensePage />} />
                <Route path="assets" element={<AssetTrackerPage />} />
                <Route path="loans" element={<LoanDashboardPage />} />
                <Route path="cashflow" element={<CashFlowPage />} />
                <Route path="tax" element={<TaxDashboardPage />} />
                <Route path="ai-advisor" element={<AIAdvisorPage />} />
                <Route path="health-score" element={<HealthScorePage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
