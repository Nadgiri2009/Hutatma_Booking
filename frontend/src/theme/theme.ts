import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#50175d',
      light: '#b45490',
      dark: '#351044',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b45490',
      light: '#d68db8',
      dark: '#813a76',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fbf6fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#351b3d',
      secondary: '#715f75',
    },
    success: { main: '#2e7d32' },
    warning: { main: '#ed6c02' },
    error:   { main: '#c62828' },
    info:    { main: '#0277bd' },
    grey: {
      50:  '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem',  fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontSize: '2rem',    fontWeight: 700, letterSpacing: '-0.3px' },
    h3: { fontSize: '1.75rem', fontWeight: 600 },
    h4: { fontSize: '1.5rem',  fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1rem',    fontWeight: 600 },
    body1: { fontSize: '0.95rem', lineHeight: 1.65 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.07)',
    '0 2px 8px rgba(0,0,0,0.09)',
    '0 4px 16px rgba(0,0,0,0.10)',
    '0 8px 24px rgba(0,0,0,0.10)',
    '0 12px 32px rgba(0,0,0,0.12)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontWeight: 600,
          letterSpacing: '0.3px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #b45490 0%, #48145e 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #9b3f7f 0%, #351044 100%)' },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #813a76 0%, #b45490 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #612568 0%, #9b3f7f 100%)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#b45490',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)',
          boxShadow: '0 2px 20px rgba(72,20,94,0.24)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#50175d',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.85rem',
            letterSpacing: '0.5px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(180,84,144,0.06)' },
          '&:nth-of-type(even)': { backgroundColor: 'rgba(0,0,0,0.02)' },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: { backgroundColor: 'transparent' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },
  },
});

export default theme;
