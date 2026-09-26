import { createTheme } from '@mui/material/styles'

// Shreeji & Shreeji — "Artisan Cream" theme.
// Warm, cozy, handcrafted: soft cream canvas, terracotta primary,
// deep cocoa text, warm sand cards, muted gold used sparingly.
// Fraunces display serif + Inter body. Component defaults are
// customised throughout so nothing reads as stock MUI.
const cream = '#FBF7EF'
const sand = '#F3EAD9'
const sandDeep = '#EFE3D0'
const terracotta = '#C96F4A'
const terracottaDeep = '#A8562F'
const terracottaSoft = '#F6E3D3'
const cocoa = '#3E2A20'
const cocoaSoft = '#8A7364'
const gold = '#D9A441'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: terracotta,
      dark: terracottaDeep,
      light: '#D6805A',
      contrastText: '#FFFDF8'
    },
    secondary: {
      main: gold,
      dark: '#B98A2F',
      light: '#E8C476',
      contrastText: cocoa
    },
    background: {
      default: cream,
      paper: '#FFFDF8'
    },
    text: {
      primary: cocoa,
      secondary: cocoaSoft
    },
    divider: sandDeep,
    success: { main: '#5E8A4E' },
    warning: { main: '#C08A2D' },
    error: { main: '#C0452F' },
    info: { main: '#6E7B86' }
  },
  shape: {
    borderRadius: 22
  },
  typography: {
    fontFamily: `"Inter","-apple-system","Segoe UI",Roboto,Arial,sans-serif`,
    h1: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, letterSpacing: '-0.01em', color: cocoa },
    h2: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, letterSpacing: '-0.01em', color: cocoa },
    h3: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, color: cocoa },
    h4: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, color: cocoa },
    h5: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, color: cocoa },
    h6: { fontFamily: `"Fraunces",Georgia,serif`, fontWeight: 600, color: cocoa },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' }
  },
  shadows: [
    'none',
    '0 1px 2px rgba(62,42,32,0.05)',
    '0 2px 8px rgba(62,42,32,0.06)',
    '0 6px 16px rgba(62,42,32,0.07)',
    '0 8px 22px rgba(62,42,32,0.08)',
    '0 10px 28px rgba(62,42,32,0.09)',
    '0 12px 34px rgba(62,42,32,0.10)',
    '0 14px 40px rgba(62,42,32,0.11)',
    '0 16px 48px rgba(62,42,32,0.12)',
    ...Array(16).fill('0 20px 56px rgba(62,42,32,0.14)')
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: cream,
          WebkitFontSmoothing: 'antialiased',
          // faint warm paper grain over the whole app
          backgroundImage:
            'radial-gradient(rgba(201,111,74,0.045) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        },
        '::selection': {
          backgroundColor: 'rgba(201,111,74,0.28)'
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingLeft: 22, paddingRight: 22 },
        containedPrimary: {
          background: `linear-gradient(135deg, #D6805A 0%, ${terracotta} 55%, ${terracottaDeep} 100%)`,
          boxShadow: '0 8px 20px rgba(201,111,74,0.32)',
          '&:hover': {
            background: `linear-gradient(135deg, ${terracotta} 0%, ${terracottaDeep} 100%)`,
            boxShadow: '0 10px 26px rgba(201,111,74,0.40)'
          },
          '&.Mui-disabled': {
            background: sandDeep,
            color: cocoaSoft
          }
        },
        outlinedPrimary: {
          borderColor: terracotta,
          color: terracottaDeep,
          '&:hover': { borderColor: terracottaDeep, backgroundColor: terracottaSoft }
        },
        textPrimary: { color: terracottaDeep }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${sandDeep}`,
          backgroundColor: '#FFFDF8',
          boxShadow: '0 6px 20px rgba(62,42,32,0.06)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 }
      }
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: '#FFFDF8',
            '& fieldset': { borderColor: '#E7D6BC' },
            '&:hover fieldset': { borderColor: terracotta },
            '&.Mui-focused fieldset': { borderColor: terracotta }
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(251,247,239,0.92)',
          backdropFilter: 'blur(12px)',
          color: cocoa,
          borderBottom: `1px solid ${sandDeep}`
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 28, border: `1px solid ${sandDeep}`, backgroundColor: '#FFFDF8' }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: sandDeep, height: 10 },
        bar: { borderRadius: 999, background: `linear-gradient(90deg,${gold},${terracotta})` }
      }
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: sandDeep } }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 24 }
      }
    },
    MuiRadio: {
      styleOverrides: {
        root: { color: '#D8C6AC', '&.Mui-checked': { color: terracotta } }
      }
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { color: '#D8C6AC', '&.Mui-checked': { color: terracotta } }
      }
    },
    MuiStepIcon: {
      styleOverrides: {
        root: { color: sandDeep, '&.Mui-active': { color: terracotta }, '&.Mui-completed': { color: terracotta } }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: terracottaDeep } }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: terracotta, height: 3, borderRadius: 3 }
      }
    }
  }
})

export default theme
