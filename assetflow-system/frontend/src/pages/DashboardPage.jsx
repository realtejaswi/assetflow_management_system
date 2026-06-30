import React, { useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress,
  Avatar, IconButton, Divider, Button
} from '@mui/material'
import {
  AccountBalance, TrendingUp, TrendingDown, AccountBalanceWallet,
  ArrowUpward, ArrowDownward, FavoriteOutlined, Refresh, AutoGraph, Sync
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { assetflowApi, mlApi, bankApi } from '../api/assetflowApi'
import MetricCard from '../components/MetricCard'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Health Score Gauge ────────────────────────────────────────
function HealthGauge({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 160, height: 160 }}>
        {/* SVG arc gauge */}
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="14" />
          <circle cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="14"
            strokeDasharray={`${(score / 100) * 376} 376`} strokeLinecap="round"
            transform="rotate(-90 80 80)" style={{ transition: '1s ease' }} />
        </svg>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1 }}>{score}</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color }}>{grade}</Typography>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mt={1}>Financial Health Score</Typography>
    </Box>
  )
}


const ASSET_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']

export default function DashboardPage() {
  const { userId } = useOutletContext() || { userId: 'demo-user' }
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: overview, refetch, isLoading } = useQuery({
    queryKey: ['af-overview', userId],
    queryFn: () => assetflowApi.get(`/dashboard/overview?user_id=${userId}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: monthlyTrend } = useQuery({
    queryKey: ['af-monthly-trend', userId],
    queryFn: () => assetflowApi.get(`/dashboard/monthly-trend?user_id=${userId}&months=6`).then(r => r.data),
  })

  const { data: expenseByCategory } = useQuery({
    queryKey: ['af-expense-cat', userId],
    queryFn: () => assetflowApi.get(`/expenses/by-category?user_id=${userId}&months=1`).then(r => r.data),
  })

  const fmt = (n) => n !== undefined ? `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'

  const assetData = overview ? [
    { name: 'Bank', value: overview.asset_breakdown?.bank_balance || 0 },
    { name: 'Stocks', value: overview.asset_breakdown?.stocks || 0 },
    { name: 'MF', value: overview.asset_breakdown?.mutual_funds || 0 },
    { name: 'Gold', value: overview.asset_breakdown?.gold || 0 },
    { name: 'FD', value: overview.asset_breakdown?.fixed_deposits || 0 },
  ].filter(d => d.value > 0) : []

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const [accountsRes, invRes, txnsRes] = await Promise.all([
        bankApi.get('/accounts/'),
        bankApi.get('/investments/summary'),
        bankApi.get('/transactions?limit=500')
      ])
      
      const totalBankBalance = accountsRes.data.reduce((sum, acc) => sum + acc.balance, 0)
      const invData = invRes.data.breakdown || {}

      await assetflowApi.post('/dashboard/sync', {
        user_id: userId,
        bank_balance: totalBankBalance,
        stock_value: invData.stocks || 0,
        mf_value: invData.mutual_funds || 0,
        gold_value: invData.gold || 0,
        fd_value: invData.fixed_deposits || 0,
        transactions: txnsRes.data
      })
      
      toast.success('Data synchronized successfully')
      refetch()
    } catch (error) {
      console.error(error)
      toast.error('Failed to synchronize data')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Financial{' '}
            <Box component="span" sx={{ background: 'linear-gradient(135deg, #6366F1, #10B981)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Intelligence Dashboard
            </Box>
          </Typography>
          <Typography color="text.secondary">Your complete financial picture, powered by AI</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleSync} 
            disabled={isSyncing}
            startIcon={isSyncing ? <Sync sx={{ animation: 'spin 2s linear infinite' }} /> : <Sync />}
            sx={{ borderColor: 'rgba(99,102,241,0.5)', color: '#6366F1' }}
          >
            {isSyncing ? 'Syncing...' : 'Sync with Bank'}
          </Button>
          <Chip label="🔴 Live" color="error" size="small" variant="outlined" sx={{ alignSelf: 'center' }} />
          <IconButton onClick={() => refetch()} sx={{ bgcolor: 'rgba(99,102,241,0.1)' }}>
            <Refresh sx={{ color: '#6366F1' }} />
          </IconButton>
        </Box>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Current Balance" value={fmt(overview?.current_balance)} subtitle="Bank accounts" color="#6366F1" icon={<AccountBalanceWallet />} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Total Assets" value={fmt(overview?.total_assets)} subtitle="All investments" color="#10B981" icon={<TrendingUp />} trend={5.2} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Net Worth" value={fmt(overview?.net_worth)} subtitle={`Liabilities: ${fmt(overview?.total_liabilities)}`} color={overview?.net_worth >= 0 ? '#22C55E' : '#EF4444'} icon={<AutoGraph />} trend={3.8} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard title="Monthly Savings" value={fmt(overview?.monthly_savings)} subtitle={`${overview?.savings_rate || 0}% of income`} color="#F59E0B" icon={<AccountBalance />} />
        </Grid>
      </Grid>



      {/* Bottom Row: Expense breakdown */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Expense Categories</Typography>
              {(expenseByCategory || []).slice(0, 6).map((cat, i) => {
                const total = expenseByCategory?.reduce((s, c) => s + c.total, 0) || 1
                return (
                  <Box key={cat.category} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{cat.category}</Typography>
                      <Typography variant="body2" fontWeight={700}>₹{cat.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(cat.total / total) * 100}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(99,102,241,0.1)', '& .MuiLinearProgress-bar': { bgcolor: ASSET_COLORS[i % ASSET_COLORS.length] } }} />
                  </Box>
                )
              })}
              {!expenseByCategory?.length && <Typography color="text.secondary">No expense data yet</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Key Metrics</Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Monthly Income', value: fmt(overview?.monthly_income), color: '#10B981' },
                  { label: 'Monthly Expense', value: fmt(overview?.monthly_expense), color: '#EF4444' },
                  { label: 'Total Liabilities', value: fmt(overview?.total_liabilities), color: '#F59E0B' },
                  { label: 'Savings Rate', value: `${overview?.savings_rate || 0}%`, color: '#6366F1' },
                ].map(item => (
                  <Grid item xs={6} key={item.label}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
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
