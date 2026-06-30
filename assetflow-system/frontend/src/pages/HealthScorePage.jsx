import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, LinearProgress, Chip } from '@mui/material'
import { assetflowApi, mlApi, bankApi } from '../api/assetflowApi'
import { useAuth } from '../contexts/AuthContext'
import { Favorite, Savings, AccountBalance, TrendingUp, Shield, WarningAmber, AttachMoney } from '@mui/icons-material'


function BigHealthGauge({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'
  
  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4 }}>
      <Box sx={{ position: 'relative', width: 240, height: 240 }}>
        {/* Background Arc */}
        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="20" />
          {/* Progress Arc */}
          <circle cx="120" cy="120" r="100" fill="none" stroke={color} strokeWidth="20"
            strokeDasharray={`${(score / 100) * 628} 628`} strokeLinecap="round"
            transform="rotate(-90 120 120)" style={{ transition: '1s ease-out' }} />
        </svg>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <Typography variant="h2" fontWeight={900} sx={{ color, lineHeight: 1, textShadow: `0 0 20px ${color}40` }}>{score}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color, mt: 1 }}>Grade: {grade}</Typography>
        </Box>
      </Box>
      <Typography variant="h6" color="text.secondary" mt={2} fontWeight={600}>Overall Health Score</Typography>
    </Box>
  )
}


export default function HealthScorePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [healthData, setHealthData] = useState(null)

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true)
        const userId = user?.id || 'demo-user'
        
        // 1. Fetch Overview to get raw numbers
        const overviewRes = await assetflowApi.get(`/dashboard/overview?user_id=${userId}`)
        const ov = overviewRes.data

        // Also fetch loans to calculate accurate EMI
        let monthlyEmi = 0
        try {
            const loansRes = await bankApi.get('/loans/')
            monthlyEmi = loansRes.data.filter(l => l.status === 'active').reduce((acc, l) => acc + l.emi_amount, 0)
        } catch(e) { console.warn("Could not fetch loans, defaulting EMI to 0") }

        // 2. Build payload for ML Service
        const payload = {
            monthly_income: ov.monthly_income,
            monthly_expense: ov.monthly_expense,
            total_savings: ov.monthly_savings,
            total_liabilities: ov.total_liabilities,
            total_assets: ov.total_assets,
            monthly_emi: monthlyEmi,
            emergency_fund: (ov.asset_breakdown?.bank_balance || 0) + (ov.asset_breakdown?.fixed_deposits || 0) // Treat bank + FD as liquid emergency fund
        }

        // 3. Request health score breakdown
        const healthRes = await mlApi.post('/predict/health-score', payload)
        setHealthData(healthRes.data)
        
      } catch (err) {
        console.error(err)
        setError('Failed to calculate health score. Ensure bank-simulator and ml-service are running.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchHealthData()
  }, [user])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!healthData) return null

  const breakdown = healthData.breakdown

  const pillars = [
    { 
        id: 'savings_rate',
        title: 'Savings Rate', 
        icon: <Savings sx={{ color: '#10B981' }} />, 
        data: breakdown.savings_rate,
        desc: 'Measures how much of your income is saved. Target is 20%+.',
        metric: breakdown.savings_rate?.rate_pct != null ? `${breakdown.savings_rate.rate_pct}%` : '0%'
    },
    { 
        id: 'debt_ratio',
        title: 'Debt-to-Income', 
        icon: <WarningAmber sx={{ color: '#F59E0B' }} />, 
        data: breakdown.debt_ratio,
        desc: 'Measures EMI burden against income. Lower is better (<40%).',
        metric: breakdown.debt_ratio?.dti_pct != null ? `${breakdown.debt_ratio.dti_pct}%` : '0%'
    },
    { 
        id: 'emergency_fund',
        title: 'Emergency Fund', 
        icon: <Shield sx={{ color: '#3B82F6' }} />, 
        data: breakdown.emergency_fund,
        desc: 'Liquid cash covering expenses. Target is 6 months.',
        metric: breakdown.emergency_fund?.months_covered != null ? `${breakdown.emergency_fund.months_covered} months` : '0'
    },
    { 
        id: 'investment_ratio',
        title: 'Investment Ratio', 
        icon: <TrendingUp sx={{ color: '#8B5CF6' }} />, 
        data: breakdown.investment_ratio,
        desc: 'Proportion of assets actively invested for growth.',
        metric: 'N/A' // Not returned in breakdown explicitly, just the score
    },
    { 
        id: 'spending_stability',
        title: 'Spending Stability', 
        icon: <AttachMoney sx={{ color: '#EC4899' }} />, 
        data: breakdown.spending_stability,
        desc: 'Measures expense volatility and control.',
        metric: 'N/A'
    },
    { 
        id: 'net_worth_health',
        title: 'Net Worth Health', 
        icon: <AccountBalance sx={{ color: '#06B6D4' }} />, 
        data: breakdown.net_worth_health,
        desc: 'Assets minus liabilities. Must be comfortably positive.',
        metric: 'N/A'
    },
  ]

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} mb={1}>
          Financial <span style={{ color: '#EC4899' }}>Health Score</span>
        </Typography>
        <Typography color="text.secondary">Deep dive into the 6 pillars determining your overall financial wellbeing.</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Big Gauge Card */}
        <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%', background: 'linear-gradient(145deg, rgba(30,41,59,0.5), rgba(15,23,42,0.8))' }}>
                <CardContent sx={{ height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Favorite sx={{ color: '#EC4899' }} />
                        <Typography variant="h6" fontWeight={700}>AI Scorecard</Typography>
                    </Box>
                    <BigHealthGauge score={Math.round(healthData.score)} />
                </CardContent>
            </Card>
        </Grid>

        {/* Pillars Breakdown */}
        <Grid item xs={12} md={7}>
            <Grid container spacing={2}>
                {pillars.map(p => {
                    const data = p.data || { score: 0, max: 0 }
                    const percentage = data.max > 0 ? (data.score / data.max) * 100 : 0
                    const pColor = percentage >= 80 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444'

                    return (
                        <Grid item xs={12} sm={6} key={p.id}>
                            <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {p.icon}
                                            <Typography fontWeight={700}>{p.title}</Typography>
                                        </Box>
                                        <Chip 
                                            label={`${data.score}/${data.max}`} 
                                            size="small" 
                                            sx={{ bgcolor: `${pColor}20`, color: pColor, fontWeight: 700, borderRadius: 1 }} 
                                        />
                                    </Box>
                                    
                                    <Box sx={{ mt: 2, mb: 1 }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={percentage} 
                                            sx={{ 
                                                height: 6, 
                                                borderRadius: 3, 
                                                bgcolor: 'rgba(255,255,255,0.1)',
                                                '& .MuiLinearProgress-bar': { bgcolor: pColor }
                                            }} 
                                        />
                                    </Box>
                                    
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, minHeight: 32 }}>
                                        {p.desc}
                                    </Typography>
                                    
                                    {p.metric !== 'N/A' && (
                                        <Typography variant="caption" fontWeight={600} sx={{ color: pColor, mt: 0.5, display: 'block' }}>
                                            Current: {p.metric}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    )
                })}
            </Grid>
        </Grid>
      </Grid>
    </Box>
  )
}
