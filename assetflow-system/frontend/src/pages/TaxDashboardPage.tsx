import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Chip, Divider, LinearProgress
} from '@mui/material'
import { Receipt, Download, CompareArrows, Lightbulb } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { taxApi } from '../api/assetflowApi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

interface TaxForm {
  annual_income: number
  age: number
  section_80c: number
  section_80d: number
  section_80d_parents_senior: boolean
  nps_80ccd_1b: number
  hra: number
  home_loan_interest: number
  home_loan_principal: number
  other_deductions: number
}

const DEFAULT_FORM: TaxForm = {
  annual_income: 1200000, age: 30, section_80c: 100000, section_80d: 25000,
  section_80d_parents_senior: false, nps_80ccd_1b: 0, hra: 0,
  home_loan_interest: 0, home_loan_principal: 0, other_deductions: 0
}

const DEDUCTION_ITEMS = [
  { field: 'section_80c', label: 'Section 80C', max: 150000, tip: 'ELSS, PPF, LIC, home loan principal' },
  { field: 'section_80d', label: 'Section 80D', max: 25000, tip: 'Health insurance premium' },
  { field: 'nps_80ccd_1b', label: 'NPS 80CCD(1B)', max: 50000, tip: 'Additional NPS contribution' },
  { field: 'hra', label: 'HRA Exemption', max: 999999, tip: 'House Rent Allowance' },
  { field: 'home_loan_interest', label: 'Home Loan Interest 24(b)', max: 200000, tip: 'Interest on home loan (self-occupied)' },
]

export default function TaxDashboardPage() {
  const [form, setForm] = useState<TaxForm>(DEFAULT_FORM)
  const [result, setResult] = useState<any>(null)

  const compareMut = useMutation({
    mutationFn: () => taxApi.post('/compare', form),
    onSuccess: (r) => setResult(r.data),
  })

  const pdfMut = useMutation({
    mutationFn: async () => {
      const response = await fetch('http://localhost:8007/report/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tax_report_FY2024-25.pdf'
      a.click()
    },
  })

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const chartData = result ? [
    { name: 'Old Regime', tax: result.old_regime.total_tax, fill: '#EF4444' },
    { name: 'New Regime', tax: result.new_regime.total_tax, fill: '#10B981' },
  ] : []

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Tax Dashboard</Typography>
      <Typography color="text.secondary" mb={4}>FY 2024-25 • Old Regime vs New Regime Comparison</Typography>

      <Grid container spacing={3}>
        {/* Input Form */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3}>Income & Deductions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField size="small" label="Annual Income (₹)" type="number" fullWidth
                  value={form.annual_income} onChange={e => setForm({ ...form, annual_income: parseFloat(e.target.value) || 0 })} />
                <TextField size="small" label="Age" type="number" fullWidth
                  value={form.age} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 30 })} />

                <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)', my: 1 }}>
                  <Typography variant="caption" color="text.secondary">Deductions (Old Regime)</Typography>
                </Divider>

                {DEDUCTION_ITEMS.map(item => (
                  <Box key={item.field}>
                    <TextField size="small" label={item.label} type="number" fullWidth
                      helperText={`Max: ${fmt(item.max)} • ${item.tip}`}
                      value={(form as any)[item.field]}
                      onChange={e => setForm({ ...form, [item.field]: parseFloat(e.target.value) || 0 })} />
                  </Box>
                ))}

                <Button variant="contained" size="large" fullWidth
                  onClick={() => compareMut.mutate()} disabled={compareMut.isPending}
                  startIcon={<CompareArrows />}>
                  {compareMut.isPending ? <CircularProgress size={22} color="inherit" /> : 'Compare Regimes'}
                </Button>

                {result && (
                  <Button variant="outlined" size="large" fullWidth
                    onClick={() => pdfMut.mutate()} disabled={pdfMut.isPending}
                    startIcon={<Download />}>
                    Download PDF Report
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={7}>
          {result ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Recommendation Banner */}
              <Alert
                severity={result.recommended_regime === 'old' ? 'warning' : 'success'}
                icon={<Lightbulb />}
                sx={{ borderRadius: 3 }}>
                <Typography fontWeight={700}>
                  {result.recommended_regime === 'new' ? '🎉 New Regime is better!' : '💡 Old Regime saves more!'}
                </Typography>
                <Typography variant="body2">{result.reason}</Typography>
                <Typography variant="body2" fontWeight={600}>You save {fmt(result.savings_with_recommended)} annually!</Typography>
              </Alert>

              {/* Comparison Chart */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>Tax Comparison</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                      <XAxis dataKey="name" stroke="#64748B" />
                      <YAxis stroke="#64748B" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Tax']} contentStyle={{ background: '#0C1526', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }} />
                      <Bar dataKey="tax" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Side by Side */}
              <Grid container spacing={2}>
                {[
                  { label: 'Old Regime', data: result.old_regime, color: '#EF4444' },
                  { label: 'New Regime', data: result.new_regime, color: '#10B981' },
                ].map(({ label, data, color }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Card sx={{ border: result.recommended_regime === label.split(' ')[0].toLowerCase() ? `1px solid ${color}` : undefined }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography fontWeight={700}>{label}</Typography>
                          {result.recommended_regime === label.split(' ')[0].toLowerCase() && <Chip label="Recommended" size="small" sx={{ bgcolor: `${color}20`, color, border: `1px solid ${color}40` }} />}
                        </Box>
                        {[
                          ['Gross Income', fmt(data.gross_income)],
                          ['Deductions', fmt(data.total_deductions)],
                          ['Taxable Income', fmt(data.taxable_income)],
                          ['Tax + Cess', fmt(data.total_tax)],
                          ['Effective Rate', `${data.effective_rate}%`],
                          ['Monthly Tax', fmt(data.monthly_tax)],
                        ].map(([k, v]) => (
                          <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid rgba(99,102,241,0.07)' }}>
                            <Typography variant="caption" color="text.secondary">{k}</Typography>
                            <Typography variant="caption" fontWeight={700}>{v}</Typography>
                          </Box>
                        ))}
                        <Typography variant="h5" fontWeight={800} sx={{ color, mt: 2, textAlign: 'center' }}>
                          {fmt(data.total_tax)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Total Annual Tax</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Tax Saving Opportunities */}
              {result.old_regime.deduction_breakdown && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={700} mb={2}>💡 Tax Saving Opportunities</Typography>
                    {result.old_regime.deduction_breakdown && Object.entries(result.old_regime.deduction_breakdown).map(([k, v]: any) => v > 0 && (
                      <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                        <Typography variant="body2" color="text.secondary">{k.replace(/_/g, ' ')}</Typography>
                        <Typography variant="body2" fontWeight={600} color="success.main">-{fmt(v)}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent sx={{ textAlign: 'center', p: 6 }}>
                <Receipt sx={{ fontSize: 80, opacity: 0.2, mb: 2 }} />
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
