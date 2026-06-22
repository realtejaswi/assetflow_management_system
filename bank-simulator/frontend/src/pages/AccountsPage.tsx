import React, { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, IconButton
} from '@mui/material'
import { AccountBalance, Add, CreditCard, Savings } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import bankApi from '../api/bankApi'
import toast from 'react-hot-toast'

export default function AccountsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ account_type: 'Savings', initial_deposit: 0, nickname: '' })

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => bankApi.get('/accounts/').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => bankApi.post('/accounts/', data),
    onSuccess: () => {
      toast.success('Account created successfully!')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setOpen(false)
      setForm({ account_type: 'Savings', initial_deposit: 0, nickname: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create account')
  })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} mb={1}>Your Accounts</Typography>
          <Typography color="text.secondary">Manage your bank accounts and open new ones</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ borderRadius: 2 }}>
          Open Account
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {accounts?.map((account: any) => (
            <Grid item xs={12} md={6} lg={4} key={account.id}>
              <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 3, border: '1px solid rgba(148,163,184,0.1)' }}>
                <Box sx={{
                  position: 'absolute', right: -20, top: -20, width: 100, height: 100,
                  borderRadius: '50%', background: 'rgba(0,198,255,0.05)'
                }} />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>
                      {account.account_type === 'Savings' ? <Savings /> : <CreditCard />}
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{account.nickname || account.account_type + ' Account'}</Typography>
                      <Typography variant="caption" color="text.secondary">Acc: {account.account_number}</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ color: '#00C6FF', mb: 1 }}>
                    ₹{account.balance.toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: <Box component="span" sx={{ color: account.is_active ? 'success.main' : 'error.main', fontWeight: 600 }}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Box>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Account Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Open New Account</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              select label="Account Type" fullWidth
              value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}
            >
              <MenuItem value="Savings">Savings</MenuItem>
              <MenuItem value="Current">Current</MenuItem>
              <MenuItem value="Salary">Salary</MenuItem>
            </TextField>
            <TextField
              label="Nickname (Optional)" fullWidth
              value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })}
              placeholder="e.g. Travel Fund"
            />
            <TextField
              label="Initial Deposit (₹)" type="number" fullWidth
              value={form.initial_deposit} onChange={e => setForm({ ...form, initial_deposit: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending}
            sx={{ borderRadius: 2 }}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
