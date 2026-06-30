import React, { useState, useEffect } from 'react'
import { Box, Typography, Card, CardContent, Grid, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'
import { bankApi } from '../api/assetflowApi'
import { useAuth } from '../contexts/AuthContext'
import MetricCard from '../components/MetricCard'
import { ShowChart, Paid, Diamond, Savings } from '@mui/icons-material'

export default function AssetTrackerPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [stocks, setStocks] = useState([])
  const [mfs, setMfs] = useState([])
  const [gold, setGold] = useState([])
  const [fds, setFds] = useState([])

  useEffect(() => {
    const fetchAssetData = async () => {
      try {
        setLoading(true)
        const [summaryRes, stocksRes, mfsRes, goldRes, fdsRes] = await Promise.all([
          bankApi.get('/investments/summary'),
          bankApi.get('/investments/stocks'),
          bankApi.get('/investments/mutual-funds'),
          bankApi.get('/investments/gold'),
          bankApi.get('/investments/fds')
        ])

        setSummary(summaryRes.data)
        setStocks(stocksRes.data)
        setMfs(mfsRes.data)
        setGold(goldRes.data)
        setFds(fdsRes.data)
      } catch (err) {
        console.error(err)
        setError('Failed to load asset data. Ensure bank-simulator is running.')
      } finally {
        setLoading(false)
      }
    }
    
    if (user) fetchAssetData()
  }, [user])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  const fmt = (val) => val != null ? `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'
  const fmtColor = (val) => val > 0 ? '#10B981' : val < 0 ? '#EF4444' : 'text.primary'

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>
        Asset <span style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tracker</span>
      </Typography>
      <Typography color="text.secondary" mb={4}>Monitor your entire investment portfolio in real-time.</Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Stocks" value={fmt(summary?.total_stocks_value)} color="#6366F1" icon={<ShowChart />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Mutual Funds" value={fmt(summary?.total_mf_value)} color="#F59E0B" icon={<Paid />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Gold Holdings" value={fmt(summary?.total_gold_value)} color="#EAB308" icon={<Diamond />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard title="Fixed Deposits" value={fmt(summary?.total_fd_value)} color="#06B6D4" icon={<Savings />} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Stocks Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 350 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Stocks Portfolio</Typography>
              {stocks.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Symbol</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Qty</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Current Value</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Gain/Loss</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stocks.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.symbol}</TableCell>
                          <TableCell align="right">{row.quantity}</TableCell>
                          <TableCell align="right">{fmt(row.current_value)}</TableCell>
                          <TableCell align="right" sx={{ color: fmtColor(row.gain_loss), fontWeight: 600 }}>
                            {row.gain_loss > 0 ? '+' : ''}{fmt(row.gain_loss)} ({row.gain_loss_pct}%)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary">No stocks found.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Mutual Funds Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 350 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Mutual Funds</Typography>
              {mfs.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Fund Code</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Units</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Current Value</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Gain/Loss</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mfs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.fund_code}</TableCell>
                          <TableCell align="right">{row.units}</TableCell>
                          <TableCell align="right">{fmt(row.current_value)}</TableCell>
                          <TableCell align="right" sx={{ color: fmtColor(row.gain_loss), fontWeight: 600 }}>
                            {row.gain_loss > 0 ? '+' : ''}{fmt(row.gain_loss)} ({row.gain_loss_pct}%)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary">No mutual funds found.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Gold Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Gold Holdings</Typography>
              {gold.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Type</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Grams</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Current Value</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Gain/Loss</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gold.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.gold_type}</TableCell>
                          <TableCell align="right">{row.grams}g</TableCell>
                          <TableCell align="right">{fmt(row.current_value)}</TableCell>
                          <TableCell align="right" sx={{ color: fmtColor(row.gain_loss), fontWeight: 600 }}>
                            {row.gain_loss > 0 ? '+' : ''}{fmt(row.gain_loss)} ({row.gain_loss_pct}%)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary">No gold holdings found.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Fixed Deposits Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', minHeight: 300 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Fixed Deposits</Typography>
              {fds.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>FD ID</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Principal</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Interest</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Maturity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fds.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>{row.id.substring(0, 8)}...</TableCell>
                          <TableCell align="right">{fmt(row.amount)}</TableCell>
                          <TableCell align="right">{row.interest_rate}% ({row.tenure_months}m)</TableCell>
                          <TableCell align="right">{new Date(row.maturity_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary">No fixed deposits found.</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
