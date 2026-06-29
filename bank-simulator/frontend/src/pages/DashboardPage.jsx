import React from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Chip, Avatar,
  IconButton, LinearProgress, Skeleton, CircularProgress
} from '@mui/material'
import {
  AccountBalance, TrendingUp, TrendingDown, SwapHoriz,
  ArrowUpward, ArrowDownward, Refresh, CreditCard
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import { useAuth } from '../contexts/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

function MetricCard({ title, value, subtitle, icon, color, trend }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{
        position: 'absolute', top: 0, right: 0, width: 120, height: 120,
        borderRadius: '50%', background: `radial-gradient(circle, ${color}20, transparent)`,
        transform: 'translate(30px, -30px)'
      }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                {trend >= 0
                  ? <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} />
                  : <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />
                }
                <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'} fontWeight={600}>
                  {Math.abs(trend)}% this month
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${color}30`
          }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 26 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Transaction Row ───────────────────────────────────────────
function TransactionRow({ txn }) {
  const isPositive = txn.amount > 0
  const CATEGORY_COLORS = {
    Food: '#F59E0B', Travel: '#3B82F6', Shopping: '#8B5CF6',
    Bills: '#EF4444', EMI: '#F97316', Investment: '#10B981',
    Healthcare: '#06B6D4', Entertainment: '#EC4899', Salary: '#22C55E',
    Other: '#94A3B8'
  }
  const catColor = CATEGORY_COLORS[txn.category] || '#94A3B8'

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', py: 1.5, px: 2,
      borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }, transition: '0.2s'
    }}>
      <Avatar sx={{ width: 40, height: 40, bgcolor: `${catColor}20`, mr: 2, fontSize: '1.1rem' }}>
        {txn.category === 'Food' ? '🍔' : txn.category === 'Travel' ? '✈️' :
          txn.category === 'Shopping' ? '🛍️' : txn.category === 'Bills' ? '💡' :
          txn.category === 'Salary' ? '💰' : txn.category === 'EMI' ? '🏦' : '💳'}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>{txn.description || txn.merchant || 'Transaction'}</Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(txn.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body2" fontWeight={700} color={isPositive ? 'success.main' : 'error.main'}>
          {isPositive ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
        </Typography>
        <Chip label={txn.category || 'Other'} size="small"
          sx={{ height: 18, fontSize: '0.65rem', bgcolor: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }} />
      </Box>
    </Box>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()

  const { data: accounts, isLoading: accsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => bankApi.get('/accounts/').then(r => r.data),
  })

  const { data: transactions, refetch } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => bankApi.get('/transactions/?limit=8').then(r => r.data),
  })

  const { data: investmentSummary } = useQuery({
    queryKey: ['investment-summary'],
    queryFn: () => bankApi.get('/investments/summary').then(r => r.data),
  })

  const { data: txnSummary } = useQuery({
    queryKey: ['txn-summary'],
    queryFn: () => bankApi.get('/transactions/summary').then(r => r.data),
  })

  const totalBalance = accounts?.reduce((sum, a) => sum + a.balance, 0) || 0
  const totalInvestments = investmentSummary?.total_investment_value || 0

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['transactions-monthly-trend'],
    queryFn: () => bankApi.get('/transactions/monthly-trend').then(r => r.data),
  })

  const formatINR = (n) => `₹${n.toLocaleString('en-IN')}`

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #00C6FF, #7C3AED)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              {user?.full_name?.split(' ')[0]} 👋
            </Box>
          </Typography>
          <Typography color="text.secondary">Here's your financial overview</Typography>
        </Box>
        <IconButton onClick={() => refetch()} sx={{ bgcolor: 'rgba(0,198,255,0.1)' }}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={6}>
          <MetricCard
            title="Total Balance"
            value={accsLoading ? '...' : formatINR(totalBalance)}
            subtitle={`${accounts?.length || 0} account(s)`}
            icon={<AccountBalance />} color="#00C6FF" trend={5.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={6}>
          <MetricCard
            title="Investments"
            value={formatINR(totalInvestments)}
            subtitle="Stocks + MF + Gold + FD"
            icon={<TrendingUp />} color="#10B981" trend={8.7}
          />
        </Grid>

      </Grid>

      {/* Charts + Transactions */}
      <Grid container spacing={3}>
        {/* Income vs Expense Chart */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: 360 }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={700} mb={3}>Income vs Expenses</Typography>
              <ResponsiveContainer width="100%" height="85%">
                {monthlyLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <CircularProgress size={24} sx={{ color: '#00C6FF' }} />
                  </Box>
                ) : (
                  <AreaChart data={monthlyData || []}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="month" stroke="#64748B" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 12 }}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
                </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: 360 }}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Recent Transactions</Typography>
                <Chip label="Live" size="small" color="success" sx={{ animation: 'pulse 2s infinite' }} />
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {transactions?.length > 0 ? (
                  transactions.map((t) => <TransactionRow key={t.id} txn={t} />)
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">No transactions yet</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Accounts */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Your Accounts</Typography>
              <Grid container spacing={2}>
                {accounts?.map((account) => (
                  <Grid item xs={12} sm={6} md={4} key={account.id}>
                    <Box sx={{
                      p: 2.5, borderRadius: 3,
                      background: 'linear-gradient(135deg, rgba(0,198,255,0.1), rgba(0,114,255,0.05))',
                      border: '1px solid rgba(0,198,255,0.2)', position: 'relative', overflow: 'hidden'
                    }}>
                      <Box sx={{
                        position: 'absolute', right: -20, top: -20, width: 80, height: 80,
                        borderRadius: '50%', background: 'rgba(0,198,255,0.1)'
                      }} />
                      <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={1}>
                        {account.account_type} Account
                      </Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ color: '#00C6FF', my: 0.5 }}>
                        ₹{account.balance.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {account.account_number} • {account.nickname || 'Primary'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
