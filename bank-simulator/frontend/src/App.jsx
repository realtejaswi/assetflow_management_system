import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { bankTheme } from './theme/bankTheme'
import bankApi from './api/bankApi'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import PaymentsPage from './pages/PaymentsPage'
import LoansPage from './pages/LoansPage'
import InvestmentsPage from './pages/InvestmentsPage'
import AdminPage from './pages/AdminPage'
import { CircularProgress, Box, Typography, Card, CardContent } from '@mui/material'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
})

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0A0F1E' }}><CircularProgress /></Box>
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}



function TransactionsPage() {
  const { data: txns } = useQuery({ queryKey: ['all-txns'], queryFn: () => bankApi.get('/transactions/?limit=50').then((r) => r.data) })
  
  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={3}>Transaction History</Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          {txns?.map((t) => (
            <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <Box>
                <Typography fontWeight={600}>{t.description || t.merchant || 'Transaction'}</Typography>
                <Typography variant="caption" color="text.secondary">{t.category} • {new Date(t.timestamp).toLocaleString('en-IN')}</Typography>
              </Box>
              <Typography fontWeight={700} color={t.amount > 0 ? 'success.main' : 'error.main'}>
                {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString('en-IN')}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={bankTheme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#1E293B', color: '#F1F5F9', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 },
              }}
            />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="loans" element={<LoansPage />} />
                <Route path="investments" element={<InvestmentsPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
