'use client'
import { createTheme } from '@mui/material/styles'

// 建立全站共用的 MUI 主題，由 app/layout.tsx 的 ThemeProvider 提供。
const theme = createTheme({
  // 讓 MUI 將主題值以 CSS 變數提供給樣式使用。
  cssVariables: true,
  typography: {
    // 對應根版型透過 next/font 設定的字體變數。
    fontFamily: 'var(--font-roboto)',
  },
})

export default theme
