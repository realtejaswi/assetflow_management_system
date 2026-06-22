import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Grid, Chip,
  CircularProgress, LinearProgress, Stepper, Step, StepLabel, Alert
} from '@mui/material'
import { CreditScore, HomeWork, DirectionsCar, School, Person } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const LOAN_TYPES = [
  { type: 'personal', label: 'Personal Loan', icon: <Person />, rate: '14%', color: '#7C3AED', maxAmt: '₹25L' },
  { type: 'home', label: 'Home Loan', icon: <HomeWork />, rate: '8.5%', color: '#10B981', maxAmt: '₹1Cr' },
  { type: 'vehicle', label: 'Vehicle Loan', icon: <DirectionsCar />, rate: '10%', color: '#F59E0B', maxAmt: '₹30L' },
  { type: 'education', label: 'Education Loan', icon: <School />, rate: '9%', color: '#06B6D4', maxAmt: '₹50L' },
]

const DEFAULT_RATES: Record<string, number> = {
  personal: 14, home: 8.5, vehicle: 10, education: 9
}

function emiCalc(principal: number, rate: number, months: number): number {
  if (rate === 0) return principal / months
  const r = rate / (12 * 100)
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)
}

export default function LoansPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    loan_type: 'personal', account_id: '', principal: '', interest_rate: '14', tenure_months: '36', purpose: ''
  })

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => bankApi.get('/accounts/').then(r => r.data) })
  const { data: loans, isLoading } = useQuery({ queryKey: ['loans'], queryFn: () => bankApi.get('/loans/').then(r => r.data) })

  const applyMutation = useMutation({
    mutationFn: (data: any) => bankApi.post('/loans/', data),
    onSuccess: () => {
      toast.success('Loan approved! EMI schedule generated 🎉')
      qc.invalidateQueries({ queryKey: ['loans'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Loan application failed'),
  })

  const emiMutation = useMutation({
    mutationFn: (loanId: string) => bankApi.post(`/loans/${loanId}/pay-emi`),
    onSuccess: () => {
      toast.success('EMI paid successfully!')
      qc.invalidateQueries({ queryKey: ['loans'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'EMI payment failed'),
  })

  const principal = parseFloat(form.principal) || 0
  const rate = parseFloat(form.interest_rate) || 0
  const months = parseInt(form.tenure_months) || 0
  const emi = principal > 0 && rate > 0 && months > 0 ? emiCalc(principal, rate, months) : 0
  const totalPayable = emi * months
  const totalInterest = totalPayable - principal

  const pieData = principal > 0 ? [
    { name: 'Principal', value: round(principal) },
    { name: 'Interest', value: round(totalInterest) },
  ] : []

  function round(n: number) { return Math.round(n * 100) / 100 }

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Loan Management</Typography>
      <Typography color="text.secondary" mb={4}>Apply for loans and manage EMIs</Typography>

      {/* Loan Type Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {LOAN_TYPES.map(lt => (
          <Grid item xs={6} md={3} key={lt.type}>
            <Card
              sx={{
                cursor: 'pointer', transition: '0.2s',
                border: form.loan_type === lt.type ? `1px solid ${lt.color}` : '1px solid rgba(148,163,184,0.1)',
                background: form.loan_type === lt.type ? `${lt.color}10` : undefined,
              }}
              onClick={() => setForm({ ...form, loan_type: lt.type, interest_rate: String(DEFAULT_RATES[lt.type]) })}
            >
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Box sx={{ color: lt.color, mb: 1 }}>{React.cloneElement(lt.icon, { sx: { fontSize: 32 } })}</Box>
                <Typography fontWeight={700} fontSize="0.9rem">{lt.label}</Typography>
                <Typography variant="caption" color="text.secondary">{lt.rate} p.a. • Up to {lt.maxAmt}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Application Form */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3}>Apply for Loan</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Disbursement Account</InputLabel>
                  <Select value={form.account_id} label="Disbursement Account"
                    onChange={e => setForm({ ...form, account_id: e.target.value })}>
                    {accounts?.map((a: any) => <MenuItem key={a.id} value={a.id}>{a.account_number}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Principal Amount (₹)" type="number" fullWidth
                  value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} />
                <TextField size="small" label="Interest Rate (% p.a.)" type="number" fullWidth
                  value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} />
                <TextField size="small" label="Tenure (Months)" type="number" fullWidth
                  value={form.tenure_months} onChange={e => setForm({ ...form, tenure_months: e.target.value })} />
                <TextField size="small" label="Purpose" fullWidth
                  value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />

                {emi > 0 && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Monthly EMI: ₹{emi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                    <Typography variant="caption">
                      Total Payable: ₹{totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })} | 
                      Interest: ₹{totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                  </Alert>
                )}

                <Button variant="contained" fullWidth size="large"
                  onClick={() => applyMutation.mutate({
                    loan_type: form.loan_type, account_id: form.account_id,
                    principal: parseFloat(form.principal), interest_rate: parseFloat(form.interest_rate),
                    tenure_months: parseInt(form.tenure_months), purpose: form.purpose
                  })}
                  disabled={applyMutation.isPending || !form.account_id || !form.principal}>
                  {applyMutation.isPending ? <CircularProgress size={22} color="inherit" /> : 'Apply for Loan'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* EMI Breakdown Pie */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>EMI Breakdown</Typography>
              {emi > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill="#00C6FF" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[
                      { label: 'Monthly EMI', value: `₹${emi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#00C6FF' },
                      { label: 'Total Interest', value: `₹${totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#EF4444' },
                      { label: 'Total Payable', value: `₹${totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#F59E0B' },
                    ].map(item => (
                      <Grid item xs={4} key={item.label} sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography color="text.secondary">Fill in loan details to see breakdown</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Loans */}
      <Typography variant="h6" fontWeight={700} mb={2}>Active Loans</Typography>
      {isLoading ? <LinearProgress /> : (
        <Grid container spacing={2}>
          {loans?.map((loan: any) => (
            <Grid item xs={12} md={6} key={loan.id}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography fontWeight={700} textTransform="capitalize">{loan.loan_type} Loan</Typography>
                      <Typography variant="caption" color="text.secondary">{loan.purpose}</Typography>
                    </Box>
                    <Chip label={loan.status} size="small"
                      color={loan.status === 'active' ? 'success' : loan.status === 'overdue' ? 'error' : 'default'} />
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: 'Principal', value: `₹${loan.principal?.toLocaleString('en-IN')}` },
                      { label: 'Outstanding', value: `₹${loan.outstanding_balance?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
                      { label: 'EMI', value: `₹${loan.emi_amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
                      { label: 'Rate', value: `${loan.interest_rate}%` },
                    ].map(item => (
                      <Grid item xs={6} key={item.label}>
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                        <Typography fontWeight={600} fontSize="0.9rem">{item.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <LinearProgress
                    variant="determinate"
                    value={((loan.principal - loan.outstanding_balance) / loan.principal) * 100}
                    sx={{ borderRadius: 2, mb: 1.5, height: 6 }}
                    color="success"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {(((loan.principal - loan.outstanding_balance) / loan.principal) * 100).toFixed(1)}% repaid
                  </Typography>
                  {loan.status === 'active' && (
                    <Button variant="outlined" size="small" fullWidth sx={{ mt: 2 }}
                      onClick={() => emiMutation.mutate(loan.id)}
                      disabled={emiMutation.isPending}>
                      Pay Next EMI
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {!loans?.length && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <CreditScore sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography>No active loans. Apply for one above!</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  )
}
