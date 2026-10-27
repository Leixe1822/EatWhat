'use client'

// 全站外觀設定：palette 管顏色、typography 管文字、shape 管圓角、components 管元件預設樣式。
import { alpha, createTheme } from '@mui/material/styles'

// 共享黑白與酸橙綠色系；首頁與地圖探索頁使用同一組設計設定。
const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: '#D3F36A',
      light: '#E5FAA9',
      dark: '#45551A', // 深色版本供文字使用，避免亮綠文字在白底上對比不足。
      contrastText: '#111111',
    },
    secondary: { main: '#242824', dark: '#111111', contrastText: '#FFFFFF' },
    background: { default: '#F6F6F2', paper: '#FFFFFF' },
    text: { primary: '#111111', secondary: '#242824' },
    divider: '#242824',
    action: { hover: '#EDF6D7', disabled: '#686C68', disabledBackground: '#E5E6DF' },
  },
  shape: { borderRadius: 16 },
  typography: {
    // 中文標題、內文、表單與按鈕共用此字型；英文品牌文字另外指定 Outfit。
    fontFamily: 'var(--font-noto-sans-tc), "PingFang TC", "Microsoft JhengHei", sans-serif',
    h1: { fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.035em' },
    h2: { fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, lineHeight: 1.25 },
    h4: { fontWeight: 700, lineHeight: 1.3 },
    h5: { fontWeight: 700, lineHeight: 1.35 },
    h6: { fontWeight: 700, lineHeight: 1.4 },
    body1: { lineHeight: 1.75 },
    body2: { lineHeight: 1.7 },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.02em' },
  },
  components: {
    // 保留既有 Paper 基礎設定；卡片硬陰影只套用於 MuiCard。
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 44,
          padding: '10px 22px',
          borderRadius: 999,
          transition: theme.transitions.create(['transform', 'box-shadow', 'background-color'], { duration: 150 }),
          '@media (hover: hover)': {
            '&:hover:not(.Mui-disabled)': { transform: 'translateY(-2px)' },
          },
          '&:active:not(.Mui-disabled)': { transform: 'translateY(0)' },
          '&.Mui-focusVisible': {
            outline: `3px solid ${theme.palette.text.primary}`,
            outlineOffset: 4,
          },
          '&.Mui-disabled': { boxShadow: 'none', transform: 'none' },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&&:hover, &&:active': { transform: 'none' },
          },
        }),
        // 背景顏色沿用 MUI 的 color prop，保留 error 等語意按鈕的配色。
        contained: ({ theme, ownerState }) => ({
          border: `2px solid ${theme.palette.divider}`,
          boxShadow: `3px 3px 0 ${theme.palette.divider}`,
          '&:hover': {
            boxShadow: `4px 5px 0 ${theme.palette.divider}`,
            ...(ownerState.color === 'primary' && { backgroundColor: theme.palette.primary.light }),
          },
          '&:active': { boxShadow: `1px 1px 0 ${theme.palette.divider}` },
          '&.Mui-disabled': { borderColor: theme.palette.action.disabled, boxShadow: 'none' },
        }),
        outlined: ({ theme }) => ({
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.divider}`,
          boxShadow: `2px 2px 0 ${theme.palette.divider}`,
          '&:hover': {
            border: `2px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.action.hover
          },
          '&.Mui-disabled': { borderColor: theme.palette.action.disabled, boxShadow: 'none' },
        }),
        text: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:hover': { backgroundColor: theme.palette.action.hover },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          // 不覆寫 error／disabled 的狀態邊框，保留表單錯誤提示。
          '&:not(.Mui-error):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '&.Mui-focused': {
            outline: `3px solid ${theme.palette.text.primary}`,
            outlineOffset: 3,
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}`,
          },
        }),
        notchedOutline: { borderWidth: 2 },
        input: ({ theme }) => ({
          '&::placeholder': { color: theme.palette.text.secondary, opacity: 0.75 },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: `calc(${typeof theme.shape.borderRadius === 'number' ? `${theme.shape.borderRadius}px` : theme.shape.borderRadius} * 1.5)`,
          boxShadow: `4px 4px 0 ${theme.palette.divider}`,
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.divider}`,
          borderRadius: `calc(${typeof theme.shape.borderRadius === 'number' ? `${theme.shape.borderRadius}px` : theme.shape.borderRadius} * 1.5)`,
          boxShadow: `6px 6px 0 ${theme.palette.divider}`,
        }),
      },
    },
    MuiLink: {
      defaultProps: { underline: 'always' },
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          textDecorationColor: theme.palette.text.secondary,
          textUnderlineOffset: '0.2em',
          textDecorationThickness: '1px',
          borderRadius: 2,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.45),
            textDecorationThickness: '2px'
          },
          '&:focus-visible': { outline: `3px solid ${theme.palette.text.primary}`, outlineOffset: 4 },
        }),
      },
    },
  },
})

export default theme
