import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Drawer, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Avatar, Divider, Chip, Tooltip, IconButton
} from '@mui/material'
import {
  Dashboard, BarChart, AccountBalance, CreditScore, Timeline,
  Receipt, SmartToy, FavoriteOutlined, Settings,
  Logout
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'



const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <Dashboard />, color: '#6366F1' },
  { path: '/expenses', label: 'Expense Analytics', icon: <BarChart />, color: '#F59E0B' },
  { path: '/assets', label: 'Asset Tracker', icon: <AccountBalance />, color: '#10B981' },
  { path: '/loans', label: 'Loan Dashboard', icon: <CreditScore />, color: '#EF4444' },
  { path: '/cashflow', label: 'Cash Flow Forecast', icon: <Timeline />, color: '#06B6D4' },
  { path: '/tax', label: 'Tax Dashboard', icon: <Receipt />, color: '#8B5CF6' },
  { path: '/ai-advisor', label: 'AI Advisor', icon: <SmartToy />, color: '#EC4899' },
  { path: '/health-score', label: 'Health Score', icon: <FavoriteOutlined />, color: '#22C55E' },

  { path: '/settings', label: 'Settings', icon: <Settings />, color: '#94A3B8' },
]

export default function AssetFlowLayout() {
  const [drawerWidth, setDrawerWidth] = useState(330)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current) {
        setDrawerWidth(Math.max(72, Math.min(e.clientX, 600)))
      }
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const open = drawerWidth > 150
  const navigate = useNavigate()
  const location = useLocation()

  // Auth user
  const { user, logout } = useAuth()
  const userId = user?.id || 'demo-user'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#050B18' }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: isDragging ? 'none' : 'width 0.3s ease',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            transition: isDragging ? 'none' : 'width 0.3s ease',
            overflow: 'hidden',
            background: 'rgba(12,21,38,0.97)',
            backdropFilter: 'blur(20px)',
            borderRight: drawerWidth > 150 ? '1px solid rgba(99,102,241,0.15)' : 'none',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, minHeight: 64 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mr: open ? 1.5 : 0, boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            overflow: 'hidden'
          }}>
            <Box
              component="img"
              src="/logo.png"
              alt="AssetFlow Logo"
              sx={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                transform: 'scale(0.95)'
              }}
            />
          </Box>
          {open && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{
                color: '#60A5FA',
                fontSize: '0.95rem',
                whiteSpace: 'nowrap'
              }}>
                AssetFlow Management System
              </Typography>
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
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
          <ListItemButton sx={{ borderRadius: '12px', flex: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366F1, #10B981)', fontSize: '0.85rem' }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </Avatar>
            </ListItemIcon>
            {open && <ListItemText primary={user?.full_name || 'AssetFlow User'} secondary={user?.email || 'user@example.com'} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }} secondaryTypographyProps={{ fontSize: '0.7rem' }} />}
          </ListItemButton>
          {open && (
            <Tooltip title="Logout">
              <IconButton onClick={logout} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Resize Handle */}
        <Box
          onMouseDown={(e) => {
            e.preventDefault()
            isDraggingRef.current = true
            setIsDragging(true)
          }}
          sx={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
            cursor: 'col-resize', zIndex: 10,
            '&:hover': { backgroundColor: 'rgba(99,102,241,0.5)' },
            backgroundColor: 'transparent', transition: 'background-color 0.2s'
          }}
        />
      </Drawer>

      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Outlet context={{ userId }} />
      </Box>
    </Box>
  )
}
