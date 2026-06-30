import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress } from '@mui/material'
import { bankApi } from '../api/assetflowApi'
import { useAuth } from '../contexts/AuthContext'
import MetricCard from '../components/MetricCard'
import { AccountBalance, EventNote, CreditScore } from '@mui/icons-material'

export default function LoanDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loans, setLoans] = useState([])
  const [schedules, setSchedules] = useState({}) // loan_id -> upcoming EMIs

  useEffect(() => {
    const fetchLoanData = async () => {
      try {
        setLoading(true)
        const loansRes = await bankApi.get('/loans/')
        const activeLoans = loansRes.data.filter(l => l.status === 'active')
        setLoans(activeLoans)

        // Fetch schedules for all active loans concurrently
        const schedMap = {}
        await Promise.all(activeLoans.map(async (loan) => {
          const scheduleRes = await bankApi.get(`/loans/${loan.id}/schedule`)
          // Filter out paid ones and keep the next 5 upcoming EMIs
          const upcoming = scheduleRes.data.filter(emi => emi.status !== 'paid').slice(0, 5)
          schedMap[loan.id] = upcoming
        }))
        
        setSchedules(schedMap)
      } catch (err) {
        console.error(err)
        setError('Failed to load loan data. Ensure bank-simulator is running.')
      } finally {
        setLoading(false)
      }
    }
    
    if (user) fetchLoanData()
  }, [user])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  const fmt = (val) => val != null ? `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'
  
  const totalOutstanding = loans.reduce((acc, curr) => acc + curr.outstanding_balance, 0)
  const totalMonthlyEMI = loans.reduce((acc, curr) => acc + curr.emi_amount, 0)
  const totalPaid = loans.reduce((acc, curr) => acc + curr.paid_amount, 0)

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>
        Loan <span style={{ background: 'linear-gradient(135deg, #EF4444, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dashboard</span>
      </Typography>
      <Typography color="text.secondary" mb={4}>Monitor your outstanding liabilities and upcoming EMI schedules.</Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <MetricCard title="Total Outstanding Debt" value={fmt(totalOutstanding)} color="#EF4444" icon={<CreditScore />} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard title="Total Monthly EMI Burden" value={fmt(totalMonthlyEMI)} color="#F59E0B" icon={<EventNote />} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard title="Total Amount Paid" value={fmt(totalPaid)} color="#10B981" icon={<AccountBalance />} />
        </Grid>
      </Grid>

      {/* Active Loans */}
      <Typography variant="h6" fontWeight={700} mb={2}>Active Loans</Typography>
      {loans.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>No active loans found.</Alert>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {loans.map(loan => {
            const totalRepaymentExpected = loan.principal + (loan.emi_amount * loan.tenure_months - loan.principal) // Rough approx, usually EMI * tenure
            const totalActual = loan.emi_amount * loan.tenure_months;
            const progress = (loan.paid_amount / totalActual) * 100;
            
            return (
              <Grid item xs={12} md={6} key={loan.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{loan.loan_type} Loan</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {loan.id.substring(0, 8)}...</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="error.main" fontWeight={700}>{fmt(loan.outstanding_balance)}</Typography>
                        <Typography variant="caption" color="text.secondary">Outstanding Balance</Typography>
                      </Box>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Principal Amount</Typography>
                        <Typography fontWeight={600}>{fmt(loan.principal)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Monthly EMI</Typography>
                        <Typography fontWeight={600}>{fmt(loan.emi_amount)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Interest Rate</Typography>
                        <Typography fontWeight={600}>{loan.interest_rate}% p.a.</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Tenure</Typography>
                        <Typography fontWeight={600}>{loan.tenure_months} months</Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>Repayment Progress</Typography>
                        <Typography variant="caption" fontWeight={600}>{progress.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(progress, 100)} 
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(239,68,68,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#EF4444' } }} 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* EMI Schedules */}
      <Typography variant="h6" fontWeight={700} mb={2}>Upcoming EMI Schedules</Typography>
      {loans.length === 0 ? (
        <Alert severity="info">No EMI schedules available.</Alert>
      ) : (
        <Grid container spacing={3}>
          {loans.map(loan => (
            <Grid item xs={12} key={`sched-${loan.id}`}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize', mb: 2 }}>
                    {loan.loan_type} Loan (Next 5 EMIs)
                  </Typography>
                  
                  {schedules[loan.id] && schedules[loan.id].length > 0 ? (
                    <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary' }}>EMI #</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>Due Date</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Amount</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Principal</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Interest</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>Balance After</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {schedules[loan.id].map((row) => (
                            <TableRow key={row.id}>
                              <TableCell sx={{ fontWeight: 600 }}>{row.emi_number}</TableCell>
                              <TableCell>{new Date(row.due_date).toLocaleDateString()}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{fmt(row.emi_amount)}</TableCell>
                              <TableCell align="right">{fmt(row.principal_component)}</TableCell>
                              <TableCell align="right">{fmt(row.interest_component)}</TableCell>
                              <TableCell align="right">{fmt(row.outstanding_balance)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : <Typography color="text.secondary">No upcoming EMIs found.</Typography>}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

    </Box>
  )
}
