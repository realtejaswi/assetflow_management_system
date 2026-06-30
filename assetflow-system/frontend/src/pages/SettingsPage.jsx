import React, { useState, useEffect } from 'react'
import { 
  Box, Typography, Card, CardContent, Grid, Divider, 
  Switch, FormControlLabel, Button, Avatar, Chip, 
  CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material'
import { 
  AccountBalance, Settings as SettingsIcon, Notifications, 
  Security, Language, Palette, Sync, DeleteForever,
  CreditCard, Savings
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { ThemeModeContext } from '../App'
import { bankApi } from '../api/assetflowApi'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuth()
  const { mode, toggleThemeMode } = React.useContext(ThemeModeContext)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])

  const [prefs, setPrefs] = useState({
    dataSharing: true
  })

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const res = await bankApi.get('/accounts/')
        setAccounts(res.data)
      } catch (err) {
        console.error("Failed to fetch connected accounts", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  const handleToggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success('Preference updated successfully')
  }

  const handleSync = () => {
    toast.success('Triggered forced sync with connected institutions')
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#6366F1', width: 56, height: 56 }}>
          <SettingsIcon fontSize="large" />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight={800}>Settings & Preferences</Typography>
          <Typography color="text.secondary">Manage your account, connections, and system preferences.</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Preferences & Profile */}
        <Grid item xs={12} md={7}>
          <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={3} display="flex" alignItems="center" gap={1}>
                <Security fontSize="small" sx={{ color: '#10B981' }}/> Profile Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography fontWeight={600}>{user?._id || 'demo-user'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Default Currency</Typography>
                  <Typography fontWeight={600}>INR (₹)</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Data Region</Typography>
                  <Typography fontWeight={600}>Mumbai, IN (ap-south-1)</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2} display="flex" alignItems="center" gap={1}>
                <Palette fontSize="small" sx={{ color: '#F59E0B' }}/> App Preferences
              </Typography>
              
              <List sx={{ p: 0 }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><Palette sx={{ color: 'text.secondary' }} /></ListItemIcon>
                  <ListItemText primary="Dark Mode" secondary="AssetFlow uses a premium dark aesthetic by default" />
                  <Switch checked={mode === 'dark'} onChange={() => {
                    toggleThemeMode()
                    toast.success('Theme preference updated successfully')
                  }} color="primary" />
                </ListItem>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><Security sx={{ color: 'text.secondary' }} /></ListItemIcon>
                  <ListItemText primary="Data Sharing (AI Analytics)" secondary="Allow anonymized data for ML forecasting" />
                  <Switch checked={prefs.dataSharing} onChange={() => handleToggle('dataSharing')} color="primary" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Integrations & Data */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={1} display="flex" alignItems="center" gap={1}>
                <AccountBalance fontSize="small" sx={{ color: '#6366F1' }}/> Linked Integrations
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Bank accounts connected via Account Aggregator.
              </Typography>

              {loading ? (
                <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>
              ) : accounts.length === 0 ? (
                <Alert severity="info" sx={{ bgcolor: 'rgba(59,130,246,0.1)' }}>No bank accounts linked.</Alert>
              ) : (
                <List sx={{ p: 0 }}>
                  {accounts.map(acc => (
                    <ListItem key={acc.id} sx={{ px: 0, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)', '&:last-child': { borderBottom: 0 } }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                          {acc.account_type === 'Savings' ? <Savings fontSize="small" /> : <CreditCard fontSize="small" />}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontWeight={600}>{acc.bank_name}</Typography>
                            <Chip label={acc.account_type} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                          </Box>
                        } 
                        secondary={`**** ${acc.account_number.slice(-4)}`} 
                      />
                      <Typography fontWeight={700} color={acc.balance >= 0 ? '#10B981' : '#EF4444'}>
                        ₹{Math.abs(acc.balance).toLocaleString('en-IN')}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}

              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Sync />} 
                onClick={handleSync}
                sx={{ mt: 2, borderColor: 'rgba(99,102,241,0.5)', color: '#6366F1' }}
              >
                Force Sync Data
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} color="error" mb={1} display="flex" alignItems="center" gap={1}>
                <DeleteForever fontSize="small" /> Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Permanently delete your account and all aggregated financial data. This action cannot be undone.
              </Typography>
              <Button 
                variant="contained" 
                color="error" 
                fullWidth 
                onClick={() => toast.error("Account deletion is disabled in demo mode.")}
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
