'use client'

import { useRef, type ReactNode } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export const SHEET_HEIGHTS = [15, 50, 90]

// 只有把手攔截拖曳；清單保留原生觸控捲動，不干擾地圖手勢。
export default function MobileSheet({ height, onHeightChange, count, children }: {
  height: number
  onHeightChange: (height: number) => void
  count: number
  children: ReactNode
}) {
  const drag = useRef<{ y: number; height: number; container: number } | null>(null)
  return <Box component="section" aria-label="附近餐廳面板"
    sx={{ position: 'absolute', zIndex: 3, bottom: 0, left: 0, right: 0, height: 'var(--sheet-size)',
      display: 'flex', flexDirection: 'column', bgcolor: 'white', border: '2px solid',
      borderColor: 'divider', borderBottom: 0, borderRadius: '28px 28px 0 0',
      pb: 'env(safe-area-inset-bottom)', overflow: 'hidden', boxShadow: '0 -4px 20px #0002' }}>
    <Box role="slider" tabIndex={0} aria-label="拖曳調整餐廳面板高度"
      aria-valuemin={15} aria-valuemax={90} aria-valuenow={height}
      aria-valuetext={height <= 15 ? '收合' : height >= 90 ? '展開' : '半開'}
      onKeyDown={e => {
        if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
          e.preventDefault()
          onHeightChange(e.key === 'Home' ? 15 : e.key === 'End' ? 90 :
            e.key === 'ArrowUp' ? (height < 50 ? 50 : 90) : (height > 50 ? 50 : 15))
        }
      }}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { y: e.clientY, height, container: e.currentTarget.parentElement?.parentElement?.clientHeight || window.innerHeight }
      }}
      onPointerMove={e => {
        if (!drag.current) return
        onHeightChange(Math.max(15, Math.min(90, drag.current.height + (drag.current.y - e.clientY) / drag.current.container * 100)))
      }}
      onPointerUp={() => {
        drag.current = null
        onHeightChange(SHEET_HEIGHTS.reduce((best, next) => Math.abs(next - height) < Math.abs(best - height) ? next : best))
      }}
      onPointerCancel={() => { drag.current = null; onHeightChange(50) }}
      sx={{ flexShrink: 0, height: 44, touchAction: 'none', cursor: 'ns-resize', display: 'grid', placeItems: 'center' }}>
      <Box sx={{ width: 42, height: 5, bgcolor: 'divider', borderRadius: 4 }} />
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, flexShrink: 0 }}>
      <Typography component="h1" sx={{ flex: 1, fontWeight: 800 }} aria-live="polite">附近餐廳（{count}）</Typography>
      <IconButton aria-label="展開餐廳面板" disabled={height >= 90} onClick={() => onHeightChange(height < 50 ? 50 : 90)} sx={{ width: 44, height: 44 }}><ExpandLessIcon /></IconButton>
      <IconButton aria-label="收合餐廳面板" disabled={height <= 15} onClick={() => onHeightChange(height > 50 ? 50 : 15)} sx={{ width: 44, height: 44 }}><ExpandMoreIcon /></IconButton>
    </Box>
    <Box sx={{ display: height <= 15 ? 'none' : 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>{children}</Box>
  </Box>
}
