import React, { useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Chip, LinearProgress,
  Avatar, IconButton, Divider, Button
} from '@mui/material'
import {
  AccountBalance, TrendingUp, TrendingDown, AccountBalanceWallet,
  ArrowUpward, ArrowDownward, FavoriteOutlined, Refresh, AutoGraph
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { assetflowApi, mlApi } from '../api/assetflowApi'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend
} from 'recharts'

// ── Health Score Gauge ────────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
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

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ title, value, subtitle, color, icon, trend }: any) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `${color}15` }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend >= 0 ? <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} /> : <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />}
                <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'} fontWeight={600}>{Math.abs(trend)}%</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 24 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

const ASSET_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']

export default function DashboardPage() {
  const { userId } = useOutletContext<{ userId: string }>() || { userId: 'demo-user' }

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

  const fmt = (n: number | undefined) => n !== undefined ? `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'

  const assetData = overview ? [
    { name: 'Bank', value: overview.asset_breakdown?.bank_balance || 0 },
    { name: 'Stocks', value: overview.asset_breakdown?.stocks || 0 },
    { name: 'MF', value: overview.asset_breakdown?.mutual_funds || 0 },
    { name: 'Gold', value: overview.asset_breakdown?.gold || 0 },
    { name: 'FD', value: overview.asset_breakdown?.fixed_deposits || 0 },
  ].filter(d => d.value > 0) : []

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
          <Chip label="🔴 Live" color="error" size="small" variant="outlined" />
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

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Health Score */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <HealthGauge score={Math.round(overview?.financial_health_score || 65)} />
              <Divider sx={{ my: 2, borderColor: 'rgba(99,102,241,0.1)' }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Savings Rate', score: Math.round((overview?.savings_rate || 0) / 20 * 20), max: 20 },
                  { label: 'Investment', score: 15, max: 20 },
                  { label: 'Debt Ratio', score: 17, max: 20 },
                ].map(item => (
                  <Box key={item.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="caption" fontWeight={600}>{item.score}/{item.max}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(item.score / item.max) * 100} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#6366F1' } }} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={700} mb={3}>Income vs Expense Trend</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={monthlyTrend || []}>
                  <defs>
                    <linearGradient id="afIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="afExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="afSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                  <XAxis dataKey="month" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                  <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#afIncome)" name="Income" />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#afExpense)" name="Expense" />
                  <Area type="monotone" dataKey="savings" stroke="#6366F1" strokeWidth={2} fill="url(#afSavings)" name="Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Allocation */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={700} mb={1}>Asset Allocation</Typography>
              {assetData.length > 0 ? (
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={assetData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={4}>
                      {assetData.map((_, i) => <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#94A3B8' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}>
                  <Typography color="text.secondary">No asset data yet</Typography>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                Total: {fmt(overview?.total_assets)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row: Expense breakdown */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Monthly Expense Categories</Typography>
              {(expenseByCategory || []).slice(0, 6).map((cat: any, i: number) => {
                const total = expenseByCategory?.reduce((s: number, c: any) => s + c.total, 0) || 1
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
