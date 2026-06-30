import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert } from '@mui/material'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'
import { bankApi, mlApi } from '../api/assetflowApi'
import { useAuth } from '../contexts/AuthContext'
import { Warning, AccountBalanceWallet, ShoppingCart, Timeline } from '@mui/icons-material'
import MetricCard from '../components/MetricCard'

const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function ExpenseAnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState([])
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [insights, setInsights] = useState(null)
  const [anomalies, setAnomalies] = useState([])

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true)
        
        // 1. Fetch from Bank Simulator
        const [summaryRes, trendRes, txnsRes] = await Promise.all([
          bankApi.get('/transactions/summary'),
          bankApi.get('/transactions/monthly-trend'),
          bankApi.get('/transactions/?limit=100')
        ])

        setSummary(summaryRes.data)
        setMonthlyTrend(trendRes.data)
        const transactions = txnsRes.data

        // 2. Fetch from ML Service (expense insights and anomalies)
        if (transactions && transactions.length > 0) {
          const mlPayload = { transactions: transactions.map(t => ({
            amount: (t.transaction_type === 'deposit' || t.transaction_type === 'salary') ? Math.abs(t.amount || 0) : -Math.abs(t.amount || 0), 
            merchant: t.merchant || '', 
            description: t.description || '', 
            category: t.category || 'Other', 
            timestamp: t.timestamp || new Date().toISOString()
          }))}
          
          const [insightsRes, anomaliesRes] = await Promise.all([
            mlApi.post('/predict/expense-insights', mlPayload),
            mlApi.post('/predict/anomalies', mlPayload)
          ])

          setInsights(insightsRes.data)
          setAnomalies(anomaliesRes.data.anomalies || [])
        }
      } catch (err) {
        console.error("Full analytics error:", err, err.response?.data)
        const errMsg = err.response?.data?.detail || err.message || 'Unknown error'
        setError(`Failed to load expense analytics: ${JSON.stringify(errMsg)}`)
      } finally {
        setLoading(false)
      }
    }
    
    if (user) fetchAnalyticsData()
  }, [user])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  const pieData = summary.filter(s => s._id).map(s => ({ name: s._id, value: Math.abs(s.total) }))
  
  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>
        Expense <span style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analytics</span>
      </Typography>
      <Typography color="text.secondary" mb={4}>Deep dive into your spending patterns powered by ML.</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <MetricCard 
            title="Daily Average Spend" 
            value={insights ? `₹${insights.daily_average.toLocaleString('en-IN', {maximumFractionDigits: 0})}` : '₹0'} 
            subtitle="Calculated over active days" 
            color="#6366F1" 
            icon={<Timeline />} 
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard 
            title="Top Merchant" 
            value={insights && insights.top_merchant ? insights.top_merchant.name : 'None'} 
            subtitle={insights && insights.top_merchant ? `Total: ₹${insights.top_merchant.total.toLocaleString('en-IN')}` : 'Not enough data'} 
            color="#F59E0B" 
            icon={<ShoppingCart />} 
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard 
            title="Anomalies Detected" 
            value={anomalies.length} 
            subtitle="Unusual transactions found" 
            color={anomalies.length > 0 ? '#EF4444' : '#10B981'} 
            icon={<Warning />} 
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Category Breakdown</Typography>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={5}>
                      {pieData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#94A3B8' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Typography color="text.secondary">No category data available.</Typography>}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>6-Month Spending Trend</Typography>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                    <XAxis dataKey="month" stroke="#64748B" />
                    <YAxis stroke="#64748B" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                    <RechartsTooltip contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Typography color="text.secondary">No trend data available.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Identified Subscriptions</Typography>
              {insights && insights.recurring_subscriptions.length > 0 ? (
                <Box>
                  {insights.recurring_subscriptions.map((sub, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 2, mb: 1, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
                      <Box>
                        <Typography fontWeight={600}>{sub.merchant}</Typography>
                        <Typography variant="caption" color="text.secondary">Detected {sub.count} times</Typography>
                      </Box>
                      <Typography color="error.main" fontWeight={600}>₹{sub.amount.toLocaleString('en-IN')}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : <Typography color="text.secondary">No recurring subscriptions detected.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Anomalous Transactions</Typography>
              {anomalies.length > 0 ? (
                <Box>
                  {anomalies.map((txn, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 2, mb: 1, bgcolor: 'rgba(239, 68, 68, 0.05)', borderRadius: 2, borderLeft: '3px solid #EF4444' }}>
                      <Box>
                        <Typography fontWeight={600}>{txn.merchant || txn.description}</Typography>
                        <Typography variant="caption" color="text.secondary">{txn.category || 'Uncategorized'}</Typography>
                      </Box>
                      <Typography color="error.main" fontWeight={600}>₹{Math.abs(txn.amount).toLocaleString('en-IN')}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : <Typography color="text.secondary">No anomalous transactions detected in recent history.</Typography>}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  )
}
