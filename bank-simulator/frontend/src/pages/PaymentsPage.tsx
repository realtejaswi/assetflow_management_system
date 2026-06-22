import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Grid, Chip,
  CircularProgress, Alert, Divider, LinearProgress, Accordion,
  AccordionSummary, AccordionDetails
} from '@mui/material'
import {
  ExpandMore, FlashOn, Payments, CreditScore, TrendingUp,
  AttachMoney, LocalAtm, AccountBalance
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import toast from 'react-hot-toast'

const MERCHANTS = [
  { name: 'Swiggy', upi: 'swiggy@ybl', category: 'Food', emoji: '🍔' },
  { name: 'Zomato', upi: 'zomato@upi', category: 'Food', emoji: '🍕' },
  { name: 'Amazon', upi: 'amazon@ybl', category: 'Shopping', emoji: '📦' },
  { name: 'Netflix', upi: 'netflix@ybl', category: 'Entertainment', emoji: '🎬' },
  { name: 'Airtel', upi: 'airtel@upi', category: 'Bills', emoji: '📱' },
  { name: 'Ola', upi: 'ola@ybl', category: 'Travel', emoji: '🚗' },
  { name: 'BESCOM', upi: 'bescom@upi', category: 'Bills', emoji: '💡' },
]

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [upiForm, setUpiForm] = useState({
    account_id: '', upi_id: '', merchant: '', amount: '', category: 'Other', description: ''
  })
  const [depositForm, setDepositForm] = useState({ account_id: '', amount: '' })
  const [withdrawForm, setWithdrawForm] = useState({ account_id: '', amount: '' })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => bankApi.get('/accounts/').then(r => r.data)
  })

  const upiMutation = useMutation({
    mutationFn: (data: any) => bankApi.post('/transactions/upi', data),
    onSuccess: () => {
      toast.success('UPI payment successful! 🎉')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['transactions-recent'] })
      setUpiForm({ account_id: '', upi_id: '', merchant: '', amount: '', category: 'Other', description: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Payment failed'),
  })

  const depositMutation = useMutation({
    mutationFn: (data: any) => bankApi.post('/transactions/deposit', data),
    onSuccess: () => { toast.success('Deposit successful!'); qc.invalidateQueries({ queryKey: ['accounts'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Deposit failed'),
  })

  const withdrawMutation = useMutation({
    mutationFn: (data: any) => bankApi.post('/transactions/withdraw', data),
    onSuccess: () => { toast.success('Withdrawal successful!'); qc.invalidateQueries({ queryKey: ['accounts'] }) },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Withdrawal failed'),
  })

  const quickPay = (merchant: (typeof MERCHANTS)[0]) => {
    if (!upiForm.account_id) return toast.error('Select an account first')
    upiMutation.mutate({
      account_id: upiForm.account_id,
      upi_id: merchant.upi,
      merchant: merchant.name,
      amount: Math.floor(Math.random() * 500) + 50,
      category: merchant.category,
      description: `Payment to ${merchant.name}`,
    })
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Payments & Transfers</Typography>
      <Typography color="text.secondary" mb={4}>UPI payments, deposits, and ATM withdrawals</Typography>

      {/* Quick Pay */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FlashOn sx={{ color: '#F59E0B' }} />
            <Typography variant="h6" fontWeight={700}>Quick Pay</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            First select an account, then tap to pay instantly
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel>Account</InputLabel>
            <Select value={upiForm.account_id} label="Account"
              onChange={e => setUpiForm({ ...upiForm, account_id: e.target.value })}>
              {accounts?.map((a: any) => (
                <MenuItem key={a.id} value={a.id}>{a.nickname || a.account_number} — ₹{a.balance.toLocaleString('en-IN')}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {MERCHANTS.map(m => (
              <Button key={m.name} variant="outlined" size="small"
                onClick={() => quickPay(m)}
                disabled={upiMutation.isPending}
                sx={{
                  borderRadius: 3, border: '1px solid rgba(148,163,184,0.2)',
                  '&:hover': { borderColor: '#00C6FF', bgcolor: 'rgba(0,198,255,0.05)' }
                }}>
                {m.emoji} {m.name}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* UPI Payment */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Payments sx={{ color: '#00C6FF' }} />
                <Typography variant="h6" fontWeight={700}>UPI Payment</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Account</InputLabel>
                  <Select value={upiForm.account_id} label="From Account"
                    onChange={e => setUpiForm({ ...upiForm, account_id: e.target.value })}>
                    {accounts?.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>{a.account_number} — ₹{a.balance.toLocaleString('en-IN')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" label="UPI ID" fullWidth
                  value={upiForm.upi_id} onChange={e => setUpiForm({ ...upiForm, upi_id: e.target.value })}
                  placeholder="merchant@ybl" />
                <TextField size="small" label="Merchant Name" fullWidth
                  value={upiForm.merchant} onChange={e => setUpiForm({ ...upiForm, merchant: e.target.value })} />
                <TextField size="small" label="Amount (₹)" type="number" fullWidth
                  value={upiForm.amount} onChange={e => setUpiForm({ ...upiForm, amount: e.target.value })} />
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={upiForm.category} label="Category"
                    onChange={e => setUpiForm({ ...upiForm, category: e.target.value })}>
                    {['Food', 'Travel', 'Shopping', 'Bills', 'Healthcare', 'Entertainment', 'Other'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="contained" fullWidth
                  onClick={() => upiMutation.mutate({ ...upiForm, amount: parseFloat(upiForm.amount) })}
                  disabled={upiMutation.isPending || !upiForm.account_id || !upiForm.amount}>
                  {upiMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Pay Now'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Deposit */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AttachMoney sx={{ color: '#10B981' }} />
                <Typography variant="h6" fontWeight={700}>Deposit</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account</InputLabel>
                  <Select value={depositForm.account_id} label="Account"
                    onChange={e => setDepositForm({ ...depositForm, account_id: e.target.value })}>
                    {accounts?.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>{a.account_number}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" label="Amount (₹)" type="number" fullWidth
                  value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} />
                <Button variant="contained" color="success" fullWidth
                  onClick={() => depositMutation.mutate({ account_id: depositForm.account_id, amount: parseFloat(depositForm.amount) })}
                  disabled={depositMutation.isPending || !depositForm.account_id || !depositForm.amount}>
                  {depositMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Deposit Money'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ATM Withdrawal */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocalAtm sx={{ color: '#F59E0B' }} />
                <Typography variant="h6" fontWeight={700}>ATM Withdrawal</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account</InputLabel>
                  <Select value={withdrawForm.account_id} label="Account"
                    onChange={e => setWithdrawForm({ ...withdrawForm, account_id: e.target.value })}>
                    {accounts?.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>{a.account_number} — ₹{a.balance.toLocaleString('en-IN')}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" label="Amount (₹)" type="number" fullWidth
                  value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} />
                {[500, 1000, 2000, 5000].map(amt => (
                  <Button key={amt} variant="outlined" size="small"
                    onClick={() => setWithdrawForm({ ...withdrawForm, amount: String(amt) })}
                    sx={{ borderRadius: 2, py: 0.5 }}>
                    ₹{amt.toLocaleString('en-IN')}
                  </Button>
                ))}
                <Button variant="contained" color="warning" fullWidth
                  onClick={() => withdrawMutation.mutate({ account_id: withdrawForm.account_id, amount: parseFloat(withdrawForm.amount), description: 'ATM Withdrawal' })}
                  disabled={withdrawMutation.isPending || !withdrawForm.account_id || !withdrawForm.amount}>
                  {withdrawMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Withdraw'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
