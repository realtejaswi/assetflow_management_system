import { createTheme, alpha } from '@mui/material/styles'

export const bankTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00C6FF',
      light: '#67e8f9',
      dark: '#0284c7',
      contrastText: '#000',
    },
    secondary: {
      main: '#7C3AED',
      light: '#a78bfa',
      dark: '#5b21b6',
    },
    success: {
      main: '#10B981',
      light: '#34d399',
    },
    error: {
      main: '#EF4444',
      light: '#f87171',
    },
    warning: {
      main: '#F59E0B',
      light: '#fbbf24',
    },
    background: {
      default: '#0A0F1E',
      paper: '#0F172A',
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(148,163,184,0.1)',
          backdropFilter: 'blur(20px)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 60px rgba(0,198,255,0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0072FF 0%, #00C6FF 100%)',
            boxShadow: '0 8px 25px rgba(0,198,255,0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(15,23,42,0.8)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(10,15,30,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
        },
      },
    },
  },
})
