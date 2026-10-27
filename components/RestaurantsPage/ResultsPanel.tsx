'use client'

import MenuIcon from '@mui/icons-material/Menu'
import { Box, Collapse, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material'
import type { Restaurant } from '@/domain/places/store'

type ResultsPanelProps = {
  restaurants: Restaurant[]
  selectedId?: string
  open: boolean // 由地圖容器管理開闔，面板只負責顯示。
  onToggle: () => void
  onSelect: (restaurant: Restaurant) => void
}

// 清單只接收既有搜尋結果，不自行發送 API 請求。
export default function ResultsPanel({ restaurants, selectedId, open, onToggle, onSelect }: ResultsPanelProps) {
  return (
    <Paper component="aside" aria-label="搜尋結果面板" sx={{ border: '2px solid', borderColor: 'divider', borderRadius: '24px', overflow: 'hidden' }}>
      <Stack direction="row" spacing={1} sx={{ p: 1.5, alignItems: 'center' }}>
        <IconButton onClick={onToggle} aria-label={open ? '收合搜尋結果' : '展開搜尋結果'} aria-expanded={open} aria-controls="restaurant-results" sx={{ bgcolor: 'primary.main', color: 'text.primary' }}><MenuIcon /></IconButton>
        <Typography component="h1" variant="h6" sx={{ display: { xs: 'block', md: open ? 'block' : 'none' }, whiteSpace: 'nowrap' }}>搜尋結果（{restaurants.length}）</Typography>
      </Stack>
      {/* Collapse 提供開闔動畫；內部清單有獨立捲動區，避免遮住整張地圖。 */}
      <Collapse in={open}>
        <Box id="restaurant-results" sx={{ maxHeight: { xs: '25dvh', md: 'calc(100dvh - 270px)' }, overflowY: 'auto', overscrollBehavior: 'contain', p: 1.5, pt: 0 }}>
          {!restaurants.length && <Typography sx={{ p: 1 }} color="text.secondary">目前沒有餐廳資料，請查看搜尋狀態。</Typography>}
          <List disablePadding aria-label="搜尋結果列表">
            {restaurants.map(restaurant => (
              <ListItemButton key={restaurant.id} selected={selectedId === restaurant.id} onClick={() => onSelect(restaurant)} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '16px', alignItems: 'flex-start', '&.Mui-selected': { bgcolor: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: 'primary.light' } }}>
                <ListItemText primary={restaurant.name} secondary={`${restaurant.rating === null ? '尚無評分' : `評分 ${restaurant.rating} / 5`} · ${restaurant.address}`} slotProps={{ primary: { sx: { fontWeight: 700 } }, secondary: { sx: { overflowWrap: 'anywhere' } } }} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Collapse>
    </Paper>
  )
}
