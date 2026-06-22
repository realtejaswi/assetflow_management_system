import React, { useState } from 'react'
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Avatar, Tooltip, Divider, Chip
} from '@mui/material'
import {
  Dashboard, AccountBalance, SwapHoriz, Payment, CreditScore,
  TrendingUp, AdminPanelSettings, Menu, Logout, AccountCircle,
  ChevronLeft
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
  { path: '/accounts', label: 'Accounts', icon: <AccountBalance /> },
  { path: '/transactions', label: 'Transactions', icon: <SwapHoriz /> },
  { path: '/payments', label: 'Payments', icon: <Payment /> },
  { path: '/loans', label: 'Loans', icon: <CreditScore /> },
  { path: '/investments', label: 'Investments', icon: <TrendingUp /> },
  { path: '/admin', label: 'Admin', icon: <AdminPanelSettings />, adminOnly: true },
]

export default function Layout() {
  const [open, setOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin')

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0A0F1E' }}>
      {/* Sidebar */}
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
            background: 'rgba(15,23,42,0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(148,163,184,0.1)',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, #00C6FF, #0072FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: open ? 1.5 : 0,
            boxShadow: '0 0 20px rgba(0,198,255,0.3)', flexShrink: 0
          }}>
            <AccountBalance sx={{ fontSize: 22, color: '#000' }} />
          </Box>
          {open && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #00C6FF, #7C3AED)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Bank Simulator
              </Typography>
              <Typography variant="caption" color="text.secondary">Financial Platform</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.1)' }} />

        {/* Nav items */}
        <List sx={{ px: 1, py: 1.5, flex: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={!open ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: '12px',
                      py: 1.2,
                      background: active ? 'linear-gradient(135deg, rgba(0,198,255,0.15), rgba(0,114,255,0.1))' : 'transparent',
                      border: active ? '1px solid rgba(0,198,255,0.3)' : '1px solid transparent',
                      '&:hover': { background: 'rgba(0,198,255,0.08)' },
                    }}
                  >
                    <ListItemIcon sx={{
                      minWidth: 40, color: active ? '#00C6FF' : 'text.secondary',
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 600 : 400,
                          color: active ? '#00C6FF' : 'text.primary',
                          fontSize: '0.9rem',
                        }}
                      />
                    )}
                    {open && item.adminOnly && <Chip label="Admin" size="small" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            )
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.1)' }} />

        {/* User profile */}
        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            sx={{ borderRadius: '12px', py: 1 }}
            onClick={logout}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {user?.full_name?.[0] || 'U'}
              </Avatar>
            </ListItemIcon>
            {open && (
              <>
                <ListItemText
                  primary={user?.full_name}
                  secondary={user?.role}
                  primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                />
                <Logout sx={{ color: 'error.main', fontSize: 18 }} />
              </>
            )}
          </ListItemButton>
        </Box>

        {/* Toggle button */}
        <IconButton
          onClick={() => setOpen(!open)}
          sx={{
            position: 'absolute', right: -12, top: 20,
            backgroundColor: '#1E293B', border: '1px solid rgba(148,163,184,0.2)',
            width: 24, height: 24, zIndex: 10,
            '&:hover': { backgroundColor: '#2D3748' }
          }}
        >
          <ChevronLeft sx={{ fontSize: 16, transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
        </IconButton>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
