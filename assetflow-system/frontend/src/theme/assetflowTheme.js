import { createTheme } from '@mui/material/styles'

export const getAssetflowTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    info: { main: '#06B6D4' },
    background: {
      default: mode === 'dark' ? '#050B18' : '#F8FAFC',
      paper: mode === 'dark' ? '#0C1526' : '#FFFFFF',
    },
    text: {
      primary: mode === 'dark' ? '#E2E8F0' : '#0F172A',
      secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? '#0C1526' : '#FFFFFF',
          border: mode === 'dark' ? '1px solid rgba(99,102,241,0.1)' : '1px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
            boxShadow: mode === 'dark' ? '0 8px 32px rgba(99,102,241,0.15)' : '0 8px 32px rgba(0,0,0,0.05)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          '&:hover': { boxShadow: '0 8px 25px rgba(99,102,241,0.4)' },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: mode === 'dark' ? 'rgba(5,11,24,0.9)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: mode === 'dark' ? '1px solid rgba(99,102,241,0.1)' : '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
  },
})
