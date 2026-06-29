import React, { useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  Tab, Tabs, Chip, CircularProgress, Select, MenuItem, FormControl, InputLabel, Alert
} from '@mui/material'
import {
  TrendingUp, TrendingDown, Savings, MonetizationOn, WorkspacePremium
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import toast from 'react-hot-toast'

export default function InvestmentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => bankApi.get('/accounts/').then(r => r.data) })
  const { data: summary } = useQuery({ queryKey: ['inv-summary'], queryFn: () => bankApi.get('/investments/summary').then(r => r.data) })
  const { data: stocks } = useQuery({ queryKey: ['stocks'], queryFn: () => bankApi.get('/investments/stocks').then(r => r.data) })
  const { data: mfs } = useQuery({ queryKey: ['mfs'], queryFn: () => bankApi.get('/investments/mutual-funds').then(r => r.data) })
  const { data: gold } = useQuery({ queryKey: ['gold'], queryFn: () => bankApi.get('/investments/gold').then(r => r.data) })
  const { data: fds } = useQuery({ queryKey: ['fds'], queryFn: () => bankApi.get('/investments/fds').then(r => r.data) })
  const { data: stockMarket } = useQuery({ queryKey: ['stock-market'], queryFn: () => bankApi.get('/investments/market/stocks').then(r => r.data) })
  const { data: mfMarket } = useQuery({ queryKey: ['mf-market'], queryFn: () => bankApi.get('/investments/market/mutual-funds').then(r => r.data) })
  const { data: goldRate } = useQuery({ queryKey: ['gold-rate'], queryFn: () => bankApi.get('/investments/market/gold').then(r => r.data) })

  const [accountId, setAccountId] = useState('')
  const [stockForm, setStockForm] = useState({ symbol: '', quantity: '' })
  const [mfForm, setMfForm] = useState({ fund_code: '', units: '' })
  const [goldForm, setGoldForm] = useState({ grams: '' })
  const [fdForm, setFdForm] = useState({ amount: '', interest_rate: '7.5', tenure_months: '12' })

  const stockMut = useMutation({ mutationFn: (d) => bankApi.post('/investments/stocks', d), onSuccess: () => { toast.success('Stock purchased!'); qc.invalidateQueries({ queryKey: ['stocks'] }) }, onError: (e) => toast.error(e.response?.data?.detail) })
  const mfMut = useMutation({ mutationFn: (d) => bankApi.post('/investments/mutual-funds', d), onSuccess: () => { toast.success('MF units purchased!'); qc.invalidateQueries({ queryKey: ['mfs'] }) }, onError: (e) => toast.error(e.response?.data?.detail) })
  const goldMut = useMutation({ mutationFn: (d) => bankApi.post('/investments/gold', d), onSuccess: () => { toast.success('Gold purchased!'); qc.invalidateQueries({ queryKey: ['gold'] }) }, onError: (e) => toast.error(e.response?.data?.detail) })
  const fdMut = useMutation({ mutationFn: (d) => bankApi.post('/investments/fds', d), onSuccess: () => { toast.success('FD created!'); qc.invalidateQueries({ queryKey: ['fds'] }) }, onError: (e) => toast.error(e.response?.data?.detail) })

  const SUMMARY_ITEMS = [
    { label: 'Stocks', value: summary?.total_stocks_value || 0, color: '#00C6FF', icon: <TrendingUp /> },
    { label: 'Mutual Funds', value: summary?.total_mf_value || 0, color: '#7C3AED', icon: <TrendingUp /> },
    { label: 'Gold', value: summary?.total_gold_value || 0, color: '#F59E0B', icon: <WorkspacePremium /> },
    { label: 'Fixed Deposits', value: summary?.total_fd_value || 0, color: '#10B981', icon: <Savings /> },
  ]

  const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Investments Portfolio</Typography>
      <Typography color="text.secondary" mb={3}>Manage stocks, mutual funds, gold, and fixed deposits</Typography>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {SUMMARY_ITEMS.map(item => (
          <Grid item xs={6} md={3} key={item.label}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: item.color }}>{item.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>{fmt(item.value)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
            <Tab label="📈 Stocks" />
            <Tab label="💼 Mutual Funds" />
            <Tab label="🥇 Gold" />
            <Tab label="🏦 Fixed Deposits" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Account selector */}
            <FormControl size="small" sx={{ minWidth: 250, mb: 3 }}>
              <InputLabel>Account</InputLabel>
              <Select value={accountId} label="Account" onChange={e => setAccountId(e.target.value)}>
                {accounts?.map((a) => <MenuItem key={a.id} value={a.id}>{a.account_number} — ₹{a.balance.toLocaleString('en-IN')}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Stocks Tab */}
            {tab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>Buy Stocks</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Stock</InputLabel>
                      <Select value={stockForm.symbol} label="Stock" onChange={e => setStockForm({ ...stockForm, symbol: e.target.value })}>
                        {stockMarket?.map((s) => <MenuItem key={s.symbol} value={s.symbol}>{s.symbol} — ₹{s.price}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Quantity" type="number" fullWidth value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} />
                    <Button variant="contained" onClick={() => stockMut.mutate({ symbol: stockForm.symbol, quantity: parseInt(stockForm.quantity), account_id: accountId })} disabled={stockMut.isPending || !accountId || !stockForm.symbol}>
                      {stockMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Buy Stock'}
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>My Holdings</Typography>
                  {stocks?.map((s) => (
                    <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <Box>
                        <Typography fontWeight={600}>{s.symbol}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.quantity} shares @ ₹{s.avg_purchase_price}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700}>₹{s.current_value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                        <Typography variant="caption" color={s.gain_loss >= 0 ? 'success.main' : 'error.main'}>
                          {s.gain_loss >= 0 ? '+' : ''}₹{s.gain_loss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({s.gain_loss_pct}%)
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {!stocks?.length && <Typography color="text.secondary">No stock holdings yet</Typography>}
                </Grid>
              </Grid>
            )}

            {/* Mutual Funds Tab */}
            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>Buy Mutual Funds</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Fund</InputLabel>
                      <Select value={mfForm.fund_code} label="Fund" onChange={e => setMfForm({ ...mfForm, fund_code: e.target.value })}>
                        {mfMarket?.map((m) => <MenuItem key={m.fund_code} value={m.fund_code}>{m.name} — ₹{m.nav} NAV</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Units" type="number" fullWidth value={mfForm.units} onChange={e => setMfForm({ ...mfForm, units: e.target.value })} />
                    <Button variant="contained" color="secondary" onClick={() => mfMut.mutate({ fund_code: mfForm.fund_code, units: parseFloat(mfForm.units), account_id: accountId })} disabled={mfMut.isPending || !accountId || !mfForm.fund_code}>
                      {mfMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Buy Units'}
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  {mfs?.map((m) => (
                    <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <Box>
                        <Typography fontWeight={600} fontSize="0.9rem">{m.fund_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.units} units • {m.category}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700}>₹{m.current_value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                        <Typography variant="caption" color={m.gain_loss >= 0 ? 'success.main' : 'error.main'}>
                          {m.gain_loss >= 0 ? '+' : ''}₹{m.gain_loss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Gold Tab */}
            {tab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    Current Rate: ₹{goldRate?.rate_per_gram_24k?.toLocaleString('en-IN')}/gram (24K)
                  </Alert>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField size="small" label="Grams" type="number" fullWidth value={goldForm.grams} onChange={e => setGoldForm({ grams: e.target.value })} />
                    {goldForm.grams && <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Total: ₹{(parseFloat(goldForm.grams) * (goldRate?.rate_per_gram_24k || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Alert>}
                    <Button variant="contained" sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                      onClick={() => goldMut.mutate({ grams: parseFloat(goldForm.grams), gold_type: '24K', account_id: accountId })}
                      disabled={goldMut.isPending || !accountId || !goldForm.grams}>
                      {goldMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Buy Gold'}
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  {gold?.map((g) => (
                    <Box key={g.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <Box>
                        <Typography fontWeight={600}>🥇 {g.grams}g {g.gold_type}</Typography>
                        <Typography variant="caption" color="text.secondary">@ ₹{g.purchase_price_per_gram}/g</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700}>₹{g.current_value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                        <Typography variant="caption" color={g.gain_loss >= 0 ? 'success.main' : 'error.main'}>
                          {g.gain_loss >= 0 ? '+' : ''}₹{g.gain_loss?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Fixed Deposits Tab */}
            {tab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField size="small" label="Principal Amount (₹)" type="number" fullWidth value={fdForm.amount} onChange={e => setFdForm({ ...fdForm, amount: e.target.value })} />
                    <TextField size="small" label="Interest Rate (% p.a.)" type="number" fullWidth value={fdForm.interest_rate} onChange={e => setFdForm({ ...fdForm, interest_rate: e.target.value })} />
                    <TextField size="small" label="Tenure (Months)" type="number" fullWidth value={fdForm.tenure_months} onChange={e => setFdForm({ ...fdForm, tenure_months: e.target.value })} />
                    {fdForm.amount && <Alert severity="success" sx={{ borderRadius: 2 }}>
                      Maturity: ₹{(parseFloat(fdForm.amount) * Math.pow(1 + parseFloat(fdForm.interest_rate) / 100, parseInt(fdForm.tenure_months) / 12)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Alert>}
                    <Button variant="contained" color="success" onClick={() => fdMut.mutate({ account_id: accountId, amount: parseFloat(fdForm.amount), interest_rate: parseFloat(fdForm.interest_rate), tenure_months: parseInt(fdForm.tenure_months) })} disabled={fdMut.isPending || !accountId || !fdForm.amount}>
                      {fdMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'Create FD'}
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  {fds?.map((f) => (
                    <Box key={f.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <Box>
                        <Typography fontWeight={600}>FD — {f.tenure_months} months @ {f.interest_rate}%</Typography>
                        <Typography variant="caption" color="text.secondary">Matures: {new Date(f.maturity_date).toLocaleDateString('en-IN')}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={700}>₹{f.maturity_amount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                        <Typography variant="caption" color="success.main">+₹{f.interest_earned?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} interest</Typography>
                      </Box>
                    </Box>
                  ))}
                </Grid>
              </Grid>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
