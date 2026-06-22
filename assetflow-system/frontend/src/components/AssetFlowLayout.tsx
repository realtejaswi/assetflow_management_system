import React, { useState } from 'react'
import {
  Box, Drawer, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Divider, Chip, Tooltip, IconButton
} from '@mui/material'
import {
  Dashboard, BarChart, AccountBalance, CreditScore, Timeline,
  Receipt, SmartToy, FavoriteOutlined, Notifications, Settings,
  ChevronLeft, Logout, AutoGraph
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const DRAWER_WIDTH = 270

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Dashboard />, color: '#6366F1' },
  { path: '/expenses', label: 'Expense Analytics', icon: <BarChart />, color: '#F59E0B' },
  { path: '/assets', label: 'Asset Tracker', icon: <AccountBalance />, color: '#10B981' },
  { path: '/loans', label: 'Loan Dashboard', icon: <CreditScore />, color: '#EF4444' },
  { path: '/cashflow', label: 'Cash Flow Forecast', icon: <Timeline />, color: '#06B6D4' },
  { path: '/tax', label: 'Tax Dashboard', icon: <Receipt />, color: '#8B5CF6' },
  { path: '/ai-advisor', label: 'AI Advisor', icon: <SmartToy />, color: '#EC4899' },
  { path: '/health-score', label: 'Health Score', icon: <FavoriteOutlined />, color: '#22C55E' },
  { path: '/alerts', label: 'Alerts', icon: <Notifications />, color: '#F97316' },
  { path: '/settings', label: 'Settings', icon: <Settings />, color: '#94A3B8' },
]

export default function AssetFlowLayout() {
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Demo user
  const userId = localStorage.getItem('assetflow_user_id') || 'demo-user'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#050B18' }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 72,
          flexShrink: 0,
          transition: 'width 0.3s',
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 72,
            transition: 'width 0.3s',
            overflow: 'hidden',
            background: 'rgba(12,21,38,0.97)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(99,102,241,0.15)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1, #10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mr: open ? 1.5 : 0, boxShadow: '0 0 20px rgba(99,102,241,0.4)',
          }}>
            <AutoGraph sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          {open && (
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{
                background: 'linear-gradient(135deg, #6366F1, #10B981)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                AssetFlow
              </Typography>
              <Typography variant="caption" color="text.secondary">Financial Intelligence</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />

        <List sx={{ px: 1, py: 1.5, flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={!open ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: '12px', py: 1.2,
                      background: active ? `${item.color}15` : 'transparent',
                      border: active ? `1px solid ${item.color}40` : '1px solid transparent',
                      '&:hover': { background: `${item.color}10` },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: active ? item.color : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 600 : 400, fontSize: '0.875rem',
                          color: active ? item.color : 'text.primary',
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            )
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)' }} />
        <Box sx={{ p: 1.5 }}>
          <ListItemButton sx={{ borderRadius: '12px' }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366F1, #10B981)', fontSize: '0.85rem' }}>A</Avatar>
            </ListItemIcon>
            {open && <ListItemText primary="AssetFlow User" secondary={userId.slice(0, 12) + '...'} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} secondaryTypographyProps={{ fontSize: '0.7rem' }} />}
          </ListItemButton>
        </Box>

        <IconButton
          onClick={() => setOpen(!open)}
          sx={{
            position: 'absolute', right: -12, top: 20,
            backgroundColor: '#1E293B', border: '1px solid rgba(99,102,241,0.2)',
            width: 24, height: 24, zIndex: 10,
            '&:hover': { backgroundColor: '#2D3748' }
          }}
        >
          <ChevronLeft sx={{ fontSize: 16, transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
        </IconButton>
      </Drawer>

      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Outlet context={{ userId }} />
      </Box>
    </Box>
  )
}
