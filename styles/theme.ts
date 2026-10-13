'use client'
import { createTheme } from '@mui/material/styles'

// 建立全站共用的 MUI 主題，由 app/layout.tsx 的 ThemeProvider 提供。
const theme = createTheme({
  // 讓 MUI 將主題值以 CSS 變數提供給樣式使用。
  cssVariables: true,
  // 將首頁原有的中性色彩集中管理，元件透過 palette token 取用。
  palette: {
    primary: { main: '#58748f' },
    secondary: { main: '#d0d5db', dark: '#bcc3cb', contrastText: '#333333' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#171717', secondary: '#505050' },
    divider: '#222222',
    action: { hover: '#eef0f2' },
  },
  typography: {
    // 對應根版型透過 next/font 設定的字體變數。
    fontFamily: 'var(--font-roboto), "PingFang TC", "Microsoft JhengHei", sans-serif',
  },
  // 共用互動樣式由 MUI 主題提供；頁面只保留尺寸與排列設定。
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 700, letterSpacing: '0.04em', textTransform: 'none',
          '&.Mui-focusVisible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 5 },
        }),
        outlined: ({ theme }) => ({
          border: `3px solid ${theme.palette.divider}`, color: theme.palette.secondary.contrastText,
          backgroundColor: theme.palette.background.paper,
          '&:hover': { border: `3px solid ${theme.palette.divider}`, backgroundColor: theme.palette.action.hover },
        }),
        contained: ({ theme }) => ({
          border: `3px solid ${theme.palette.divider}`, color: theme.palette.secondary.contrastText,
          backgroundColor: theme.palette.secondary.main,
          '&:hover': { backgroundColor: theme.palette.secondary.dark },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 5 },
        }),
        input: ({ theme }) => ({
          '&::placeholder': { color: theme.palette.text.secondary, opacity: 1 },
        }),
      },
    },
    MuiLink: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:focus-visible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 5 },
        }),
      },
    },
  },
})

export default theme
