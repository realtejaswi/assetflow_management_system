import { createTheme } from '@mui/material/styles'

export const assetflowTheme = createTheme({
  palette: {
    mode: 'dark',
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
      default: '#050B18',
      paper: '#0C1526',
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
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
          backgroundColor: '#0C1526',
          border: '1px solid rgba(99,102,241,0.1)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'rgba(99,102,241,0.3)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
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
          backgroundColor: 'rgba(5,11,24,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
        },
      },
    },
  },
})
