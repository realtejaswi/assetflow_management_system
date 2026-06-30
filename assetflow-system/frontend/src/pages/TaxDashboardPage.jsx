import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Select, MenuItem, FormControl, InputLabel, Alert, Chip, Divider
} from '@mui/material'
import { Receipt, Calculate, RestartAlt, CheckCircle, CompareArrows } from '@mui/icons-material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'


// ── Indian Tax Slabs FY 2024-25 ──────────────────────────────
function calcOldRegimeTax(taxableIncome, age) {
  let tax = 0
  let remaining = taxableIncome

  // Old regime slabs depend on age
  let slabs
  if (age < 60) {
    slabs = [
      { limit: 250000, rate: 0 },
      { limit: 250000, rate: 0.05 },
      { limit: 500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ]
  } else if (age < 80) {
    slabs = [
      { limit: 300000, rate: 0 },
      { limit: 200000, rate: 0.05 },
      { limit: 500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ]
  } else {
    slabs = [
      { limit: 500000, rate: 0 },
      { limit: 500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ]
  }

  for (const slab of slabs) {
    if (remaining <= 0) break
    const chunk = Math.min(remaining, slab.limit)
    tax += chunk * slab.rate
    remaining -= chunk
  }

  // Rebate u/s 87A: if taxable income <= 5L, tax = 0
  if (taxableIncome <= 500000) tax = 0

  return tax
}

function calcNewRegimeTax(taxableIncome) {
  let tax = 0
  let remaining = taxableIncome

  // New regime slabs FY 2024-25 (Budget 2024)
  const slabs = [
    { limit: 300000, rate: 0 },
    { limit: 400000, rate: 0.05 },
    { limit: 300000, rate: 0.10 },
    { limit: 200000, rate: 0.15 },
    { limit: 300000, rate: 0.20 },
    { limit: 300000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ]

  for (const slab of slabs) {
    if (remaining <= 0) break
    const chunk = Math.min(remaining, slab.limit)
    tax += chunk * slab.rate
    remaining -= chunk
  }

  // Rebate u/s 87A new regime: if taxable income <= 7L
  if (taxableIncome <= 700000) tax = 0

  return tax
}

function addCess(tax) {
  // 4% Health & Education Cess
  return tax + tax * 0.04
}


const STANDARD_DEDUCTION = 50000
const NEW_REGIME_STANDARD_DEDUCTION = 75000

export default function TaxDashboardPage() {
  const [form, setForm] = useState({
    grossSalary: 1000000,
    age: 'below60',
    regime: 'compare',
    deductions: 200000,
  })
  const [result, setResult] = useState(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleClear = () => {
    setForm({ grossSalary: 1000000, age: 'below60', regime: 'compare', deductions: 200000 })
    setResult(null)
  }

  const handleCalculate = () => {
    const gross = parseFloat(form.grossSalary) || 0
    const ageNum = form.age === 'below60' ? 30 : form.age === '60to80' ? 65 : 85
    const deductions = parseFloat(form.deductions) || 0

    // --- Old Regime ---
    const oldDeductions = STANDARD_DEDUCTION + deductions
    const oldTaxableIncome = Math.max(0, gross - oldDeductions)
    const oldBaseTax = calcOldRegimeTax(oldTaxableIncome, ageNum)
    const oldTotalTax = Math.round(addCess(oldBaseTax))

    // --- New Regime ---
    const newTaxableIncome = Math.max(0, gross - NEW_REGIME_STANDARD_DEDUCTION)
    const newBaseTax = calcNewRegimeTax(newTaxableIncome)
    const newTotalTax = Math.round(addCess(newBaseTax))

    const recommended = oldTotalTax <= newTotalTax ? 'old' : 'new'
    const savings = Math.abs(newTotalTax - oldTotalTax)

    setResult({
      old: {
        grossIncome: gross,
        totalDeductions: oldDeductions,
        taxableIncome: oldTaxableIncome,
        totalTax: oldTotalTax,
        effectiveRate: gross > 0 ? ((oldTotalTax / gross) * 100).toFixed(1) : '0.0',
        monthlyTax: Math.round(oldTotalTax / 12),
      },
      new: {
        grossIncome: gross,
        totalDeductions: NEW_REGIME_STANDARD_DEDUCTION,
        taxableIncome: newTaxableIncome,
        totalTax: newTotalTax,
        effectiveRate: gross > 0 ? ((newTotalTax / gross) * 100).toFixed(1) : '0.0',
        monthlyTax: Math.round(newTotalTax / 12),
      },
      recommended,
      savings,
    })
  }

  const fmt = (n) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const chartData = result ? [
    { name: 'Old Regime', tax: result.old.totalTax, fill: '#F59E0B' },
    { name: 'New Regime', tax: result.new.totalTax, fill: '#6366F1' },
  ] : []

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>
        Income Tax{' '}
        <Box component="span" sx={{ background: 'linear-gradient(135deg, #6366F1, #10B981)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Calculator
        </Box>
      </Typography>
      <Typography color="text.secondary" mb={4}>
        Estimate tax under Old vs New regime and see potential savings. FY 2024-25.
      </Typography>

      <Grid container spacing={3}>
        {/* ── Input Form ───────────────────────────────────── */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3}>
                <Receipt sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom', color: '#6366F1' }} />
                Income Details
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Row 1: Salary + Age */}
                <Grid container spacing={2}>
                  <Grid item xs={7}>
                    <TextField
                      size="small" label="Annual Gross Salary (₹)" type="number" fullWidth
                      value={form.grossSalary}
                      onChange={e => handleChange('grossSalary', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Age</InputLabel>
                      <Select value={form.age} label="Age"
                        onChange={e => handleChange('age', e.target.value)}>
                        <MenuItem value="below60">Below 60</MenuItem>
                        <MenuItem value="60to80">60 - 80</MenuItem>
                        <MenuItem value="above80">Above 80</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Row 2: Regime + Deductions */}
                <Grid container spacing={2}>
                  <Grid item xs={7}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Regime Preference</InputLabel>
                      <Select value={form.regime} label="Regime Preference"
                        onChange={e => handleChange('regime', e.target.value)}>
                        <MenuItem value="compare">Compare both (recommended)</MenuItem>
                        <MenuItem value="old">Old Regime only</MenuItem>
                        <MenuItem value="new">New Regime only</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      size="small" label="Deductions (approx ₹)" type="number" fullWidth
                      value={form.deductions}
                      onChange={e => handleChange('deductions', e.target.value)}
                      helperText="80C + 80D + HRA etc."
                    />
                  </Grid>
                </Grid>

                {/* Buttons */}
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Button
                    variant="contained" size="large"
                    startIcon={<Calculate />}
                    onClick={handleCalculate}
                    sx={{
                      bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' },
                      fontWeight: 700, px: 4, borderRadius: 2
                    }}
                  >
                    Calculate Tax
                  </Button>
                  <Button
                    variant="outlined" size="large"
                    startIcon={<RestartAlt />}
                    onClick={handleClear}
                    sx={{
                      borderColor: 'rgba(99,102,241,0.3)', color: 'text.secondary',
                      fontWeight: 600, borderRadius: 2
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Results ──────────────────────────────────────── */}
        <Grid item xs={12} md={7}>
          {result ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

              {/* Recommendation Banner */}
              {(form.regime === 'compare' || form.regime === result.recommended) && (
                <Card sx={{
                  background: result.recommended === 'old'
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))',
                  border: `1px solid ${result.recommended === 'old' ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
                }}>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <CheckCircle sx={{ color: result.recommended === 'old' ? '#F59E0B' : '#6366F1' }} />
                      <Typography fontWeight={700}>
                        Selected regime (recommended): <span style={{ color: result.recommended === 'old' ? '#F59E0B' : '#6366F1', textTransform: 'capitalize' }}>{result.recommended}</span>
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card sx={{ bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: 1.5 }}>
                              ESTIMATED TAX PAYABLE
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: result.recommended === 'old' ? '#F59E0B' : '#6366F1' }}>
                              {fmt(result.recommended === 'old' ? result.old.totalTax : result.new.totalTax)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card sx={{ bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: 1.5 }}>
                              SAVINGS POTENTIAL
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="success.main">
                              {fmt(result.savings)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Regime Comparison */}
              {form.regime === 'compare' && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CompareArrows sx={{ color: '#6366F1' }} />
                      <Typography variant="h6" fontWeight={700}>Regime Comparison</Typography>
                    </Box>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.04)', border: result.recommended === 'new' ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.08)' }}>
                          <Typography variant="caption" color="text.secondary">New Regime Tax</Typography>
                          <Typography variant="h5" fontWeight={800} sx={{ color: '#6366F1' }}>{fmt(result.new.totalTax)}</Typography>
                          <Typography variant="caption" color="text.secondary">Effective Rate: {result.new.effectiveRate}%</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.04)', border: result.recommended === 'old' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.08)' }}>
                          <Typography variant="caption" color="text.secondary">Old Regime Tax</Typography>
                          <Typography variant="h5" fontWeight={800} sx={{ color: '#F59E0B' }}>{fmt(result.old.totalTax)}</Typography>
                          <Typography variant="caption" color="text.secondary">Effective Rate: {result.old.effectiveRate}%</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                        <XAxis dataKey="name" stroke="#64748B" />
                        <YAxis stroke="#64748B" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                        <Tooltip formatter={(v) => [fmt(v), 'Tax']} contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} />
                        <Bar dataKey="tax" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Breakdown Cards */}
              <Grid container spacing={2}>
                {(form.regime === 'compare' || form.regime === 'old') && (
                  <Grid item xs={12} sm={form.regime === 'compare' ? 6 : 12}>
                    <Card sx={{ height: '100%', border: result.recommended === 'old' ? '1px solid rgba(245,158,11,0.3)' : undefined }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography fontWeight={700}>Old Regime</Typography>
                          {result.recommended === 'old' && <Chip label="Recommended" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600, fontSize: '0.7rem' }} />}
                        </Box>
                        {[
                          ['Gross Income', fmt(result.old.grossIncome)],
                          ['Standard Deduction', fmt(STANDARD_DEDUCTION)],
                          ['Other Deductions', fmt(parseFloat(form.deductions) || 0)],
                          ['Total Deductions', fmt(result.old.totalDeductions)],
                        ].map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                            <Typography variant="body2" color="text.secondary">{k}</Typography>
                            <Typography variant="body2" fontWeight={600}>{v}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1.5, borderColor: 'rgba(99,102,241,0.1)' }} />
                        {[
                          ['Taxable Income', fmt(result.old.taxableIncome)],
                          ['Tax + 4% Cess', fmt(result.old.totalTax)],
                          ['Effective Rate', `${result.old.effectiveRate}%`],
                          ['Monthly Tax', fmt(result.old.monthlyTax)],
                        ].map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                            <Typography variant="body2" color="text.secondary">{k}</Typography>
                            <Typography variant="body2" fontWeight={700}>{v}</Typography>
                          </Box>
                        ))}
                        <Typography variant="h5" fontWeight={800} sx={{ color: '#F59E0B', mt: 2, textAlign: 'center' }}>
                          {fmt(result.old.totalTax)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Total Annual Tax</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {(form.regime === 'compare' || form.regime === 'new') && (
                  <Grid item xs={12} sm={form.regime === 'compare' ? 6 : 12}>
                    <Card sx={{ height: '100%', border: result.recommended === 'new' ? '1px solid rgba(99,102,241,0.3)' : undefined }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography fontWeight={700}>New Regime</Typography>
                          {result.recommended === 'new' && <Chip label="Recommended" size="small" sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600, fontSize: '0.7rem' }} />}
                        </Box>
                        {[
                          ['Gross Income', fmt(result.new.grossIncome)],
                          ['Standard Deduction', fmt(NEW_REGIME_STANDARD_DEDUCTION)],
                          ['Other Deductions', '₹0 (not allowed)'],
                          ['Total Deductions', fmt(result.new.totalDeductions)],
                        ].map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                            <Typography variant="body2" color="text.secondary">{k}</Typography>
                            <Typography variant="body2" fontWeight={600}>{v}</Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 1.5, borderColor: 'rgba(99,102,241,0.1)' }} />
                        {[
                          ['Taxable Income', fmt(result.new.taxableIncome)],
                          ['Tax + 4% Cess', fmt(result.new.totalTax)],
                          ['Effective Rate', `${result.new.effectiveRate}%`],
                          ['Monthly Tax', fmt(result.new.monthlyTax)],
                        ].map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                            <Typography variant="body2" color="text.secondary">{k}</Typography>
                            <Typography variant="body2" fontWeight={700}>{v}</Typography>
                          </Box>
                        ))}
                        <Typography variant="h5" fontWeight={800} sx={{ color: '#6366F1', mt: 2, textAlign: 'center' }}>
                          {fmt(result.new.totalTax)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Total Annual Tax</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent sx={{ textAlign: 'center', p: 6 }}>
                <Receipt sx={{ fontSize: 80, opacity: 0.15, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Enter your income and deductions</Typography>
                <Typography variant="body2" color="text.secondary">to see Old vs New regime comparison</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
