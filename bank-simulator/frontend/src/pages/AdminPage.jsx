import React, { useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Chip, CircularProgress, Alert, Divider
} from '@mui/material'
import {
  AdminPanelSettings, FlashOn, Person, CreditScore, TrendingUp, Payments
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const qc = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [loanId, setLoanId] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('85000')
  const [txnCount, setTxnCount] = useState('10')
  const [loanType, setLoanType] = useState('personal')
  const [invType, setInvType] = useState('fd')
  const [log, setLog] = useState([])

  const addLog = (msg) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)])

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => bankApi.get('/accounts/').then(r => r.data) })
  const { data: loans } = useQuery({ queryKey: ['loans'], queryFn: () => bankApi.get('/loans/').then(r => r.data) })
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => bankApi.get('/admin/stats').then(r => r.data), refetchInterval: 10000 })

  const mutOpts = (label) => ({
    onSuccess: (d) => { toast.success(`${label} successful!`); addLog(`✅ ${label}: ${JSON.stringify(d?.message || '')}`); qc.invalidateQueries() },
    onError: (e) => { toast.error(e.response?.data?.detail || `${label} failed`); addLog(`❌ ${label} failed: ${e.response?.data?.detail}`) }
  })

  const salaryMut = useMutation({ mutationFn: () => bankApi.post(`/admin/generate/salary-credit?account_id=${accountId}&amount=${salaryAmount}`), ...mutOpts('Salary Credit') })
  const randomTxnMut = useMutation({ mutationFn: () => bankApi.post(`/admin/generate/random-transactions?account_id=${accountId}&count=${txnCount}`), ...mutOpts('Random Transactions') })
  const loanMut = useMutation({ mutationFn: () => bankApi.post(`/admin/generate/loan-event?account_id=${accountId}&loan_type=${loanType}`), ...mutOpts('Loan Event') })
  const emiMut = useMutation({ mutationFn: () => bankApi.post(`/admin/generate/emi-event?loan_id=${loanId}`), ...mutOpts('EMI Event') })
  const invMut = useMutation({ mutationFn: () => bankApi.post(`/admin/generate/investment-event?account_id=${accountId}&investment_type=${invType}`), ...mutOpts('Investment Event') })

  const STAT_ITEMS = [
    { label: 'Users', value: stats?.total_users || 0 },
    { label: 'Accounts', value: stats?.total_accounts || 0 },
    { label: 'Transactions', value: stats?.total_transactions || 0 },
    { label: 'Loans', value: stats?.total_loans || 0 },
    { label: 'FDs', value: stats?.total_fds || 0 },
    { label: 'Events', value: stats?.total_events || 0 },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <AdminPanelSettings sx={{ color: '#7C3AED', fontSize: 32 }} />
        <Box>
          <Typography variant="h4" fontWeight={800} mb={1}>Admin Console</Typography>
          <Typography color="text.secondary">Generate events and monitor The Bank</Typography>
        </Box>

        <Chip label="Admin Only" color="secondary" size="small" sx={{ ml: 'auto' }} />
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ my: 3 }}>
        {STAT_ITEMS.map(s => (
          <Grid item xs={4} md={2} key={s.label}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#7C3AED' }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Account Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Target Account</Typography>
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel>Select Account</InputLabel>
            <Select value={accountId} label="Select Account" onChange={e => setAccountId(e.target.value)}>
              {accounts?.map((a) => <MenuItem key={a.id} value={a.id}>{a.account_number} — ₹{a.balance.toLocaleString('en-IN')} ({a.user_id?.slice(0, 8)})</MenuItem>)}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Salary Credit */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person sx={{ color: '#10B981' }} />
                <Typography fontWeight={700}>Salary Credit</Typography>
              </Box>
              <TextField size="small" label="Salary Amount (₹)" type="number" fullWidth value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} sx={{ mb: 2 }} />
              <Button variant="contained" color="success" fullWidth onClick={() => salaryMut.mutate()} disabled={salaryMut.isPending || !accountId}>
                {salaryMut.isPending ? <CircularProgress size={20} color="inherit" /> : '💰 Credit Salary'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Random Transactions */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Payments sx={{ color: '#00C6FF' }} />
                <Typography fontWeight={700}>Random Transactions</Typography>
              </Box>
              <TextField size="small" label="Number of Transactions" type="number" fullWidth value={txnCount} onChange={e => setTxnCount(e.target.value)} sx={{ mb: 2 }} inputProps={{ min: 1, max: 50 }} />
              <Button variant="contained" fullWidth onClick={() => randomTxnMut.mutate()} disabled={randomTxnMut.isPending || !accountId}>
                {randomTxnMut.isPending ? <CircularProgress size={20} color="inherit" /> : '⚡ Generate Transactions'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Event */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CreditScore sx={{ color: '#7C3AED' }} />
                <Typography fontWeight={700}>Loan Event</Typography>
              </Box>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Loan Type</InputLabel>
                <Select value={loanType} label="Loan Type" onChange={e => setLoanType(e.target.value)}>
                  {['personal', 'home', 'vehicle', 'education'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" color="secondary" fullWidth onClick={() => loanMut.mutate()} disabled={loanMut.isPending || !accountId}>
                {loanMut.isPending ? <CircularProgress size={20} color="inherit" /> : '🏦 Generate Loan'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* EMI Event */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography fontWeight={700} mb={2}>⏰ Trigger EMI Payment</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Loan</InputLabel>
                <Select value={loanId} label="Loan" onChange={e => setLoanId(e.target.value)}>
                  {loans?.filter((l) => l.status === 'active').map((l) => (
                    <MenuItem key={l.id} value={l.id}>{l.loan_type} — ₹{l.emi_amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" fullWidth onClick={() => emiMut.mutate()} disabled={emiMut.isPending || !loanId}>
                {emiMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Pay EMI'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Investment Event */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: '#F59E0B' }} />
                <Typography fontWeight={700}>Investment Event</Typography>
              </Box>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Type</InputLabel>
                <Select value={invType} label="Type" onChange={e => setInvType(e.target.value)}>
                  {['fd', 'stock', 'mf', 'gold'].map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'uppercase' }}>{t.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" color="warning" fullWidth onClick={() => invMut.mutate()} disabled={invMut.isPending || !accountId}>
                {invMut.isPending ? <CircularProgress size={20} color="inherit" /> : '📈 Create Investment'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Event Log */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography fontWeight={700} mb={2}>📋 Event Log</Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 200, overflow: 'auto', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, p: 1.5 }}>
                {log.length > 0 ? log.map((l, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', color: l.includes('✅') ? '#10B981' : l.includes('❌') ? '#EF4444' : 'text.secondary' }}>
                    {l}
                  </Typography>
                )) : <Typography variant="caption" color="text.secondary">Events will appear here...</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
