'use client'

import Link from 'next/link'
import FlatwareIcon from '@mui/icons-material/Flatware'
import { Box, Typography } from '@mui/material'

// 兩頁共用品牌標誌；Next Link 返回首頁時保留共用 Provider 與金鑰狀態。
export default function Logo() {
  return (
    <Box
      component={Link}
      href="/"
      aria-label="EatWhat 首頁"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1.25,
        color: 'text.primary', textDecoration: 'none', flexShrink: 0,
        borderRadius: '12px',
        '&:focus-visible': { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: 5 },
      }}
    >
      {/* 酸橙綠底塊搭配餐具圖示；xs / sm 分別調整手機與較大螢幕尺寸。 */}
      <Box
        component="span"
        sx={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 },
          bgcolor: 'primary.main', color: 'text.primary',
          border: '2px solid', borderColor: 'divider', borderRadius: '12px',
          boxShadow: '2px 2px 0 var(--mui-palette-divider)',
        }}
      >
        <FlatwareIcon aria-hidden="true" sx={{ fontSize: { xs: 24, sm: 28 } }} />
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: 'var(--font-outfit), sans-serif', fontWeight: 800,
          fontSize: { xs: 27, sm: 32 }, lineHeight: 1.1,
          letterSpacing: '-0.04em', whiteSpace: 'nowrap',
        }}
      >EatWhat.</Typography>
    </Box>
  )
}
