'use client'

// 首頁展示元件：負責排版與表單；透過 props 接收資料與事件，不直接呼叫 Google。
import type { ReactNode, SubmitEvent } from 'react'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { Box, Button, Chip, Grid, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material'

// 版面只接收顯示內容，搜尋與 API 狀態由 LandingPage 管理。
type HomeHeroProps = {
  children: ReactNode // 開始與結束標籤之間的內容，這裡放搜尋卡片。
  feedback?: ReactNode // ? 代表可省略；用來顯示載入中或錯誤。
}
export default function HomeHero({ children, feedback }: HomeHeroProps) {
  return (
    // Grid 共 12 欄；xs: 12 是手機單欄，md: 6 是桌面左右各半。
    <Grid
      container
      spacing={{ xs: 4, md: 3, lg: 5 }}
      sx={{ alignItems: 'center', py: { xs: 4, md: 4 }, minHeight: { md: 'calc(100svh - 130px)' } }}
    >
      <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          <Chip
            label="✳ FIND YOUR NEXT BITE"
            sx={{
              fontFamily: 'var(--font-outfit), sans-serif',
              alignSelf: 'flex-start',
              bgcolor: 'primary.main',
              border: '1.5px solid',
              borderColor: 'divider',
              fontWeight: 800,
              letterSpacing: '0.035em',
              fontSize: { xs: 12, sm: 14 }
            }}
          />
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 40, sm: 52, md: 48, lg: 60 },
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: '-0.025em'
            }}
          >
            今天吃什麼？
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: 16, sm: 18 }, lineHeight: 1.7 }}>從你的附近開始，發現每一口驚喜。</Typography>
          {children}
          {feedback && <Box role="status" aria-live="polite">{feedback}</Box>}
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            border: '3px solid',
            borderColor: 'divider',
            borderRadius: { xs: '28px', sm: '34px' },
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '0.9',
            width: '100%',
            maxWidth: { xs: 600, md: 'none' },
            mx: 'auto'
          }}
        >
        </Box>
      </Grid>
    </Grid>
  )
}

// 事件 props 是父元件傳來的函式，表單只在互動時呼叫它們。
type SearchCardProps = {
  query?: string
  busy?: boolean
  ready?: boolean
  geocodingReady?: boolean
  onQueryChange?: (value: string) => void
  onSearch?: (event: SubmitEvent<HTMLFormElement>) => void
  onLocate?: () => void
}
export function SearchCard({ query = '', busy = false, ready = false, geocodingReady = false, onQueryChange, onSearch, onLocate }: SearchCardProps) {
  // SubmitEvent 是提交事件；HTMLFormElement 是觸發事件的表單元素型別。
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // 沒有傳入搜尋函式時仍阻止瀏覽器送出原生表單，避免整頁重新載入。
    if (onSearch) {
      onSearch(event)
    } else {
      event.preventDefault()
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={theme => ({
        p: { xs: 2, sm: 2.5 },
        border: '2px solid',
        borderColor: 'divider',
        borderRadius: '26px',
        boxShadow: `4px 4px 0 ${theme.palette.divider}`
      })}
    >
      <Stack spacing={2.5}>
        <TextField
          variant="standard"
          placeholder="輸入地址或地標"
          value={query}
          onChange={event => onQueryChange?.(event.target.value)}
          disabled={!ready || busy}
          fullWidth
          slotProps={{
            htmlInput: { 'aria-label': '輸入地址或地標' },
            input: {
              startAdornment: <InputAdornment position="start"><Box
                component="svg"
                viewBox="0 0 24 24"
                aria-hidden="true"
                sx={{ width: 23, height: 23, color: 'text.secondary' }}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              ><path d="M12 22s8-8 8-14a8 8 0 0 0-16 0c0 6 8 14 8 14Z" transform="translate(2 2) scale(.83)" /><circle cx="12" cy="9" r="2.5" /></Box></InputAdornment>
            }
          }}
          sx={{
            '& .MuiInput-root': {
              minHeight: 68,
              pb: 2,
              px: 0.5,
              '&::before': { borderBottomColor: 'divider', opacity: 0.18 },
              '&::after': { borderBottomColor: 'text.primary' },
              '&.Mui-focused': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 4, borderRadius: 1 }
            },
            '& input': { fontSize: { xs: 16, sm: 18 } }
          }}
        />
        {/* row 讓兩個按鈕左右並排，各佔一半寬度。 */}
        <Stack direction="row" spacing={1} sx={{ '& > button': { flex: 1, minWidth: 0, px: { xs: 0.5, sm: 2 }, whiteSpace: 'nowrap' } }}>
          <Button
            type="submit"
            variant="contained"
            disabled={!ready || busy || !geocodingReady}
            fullWidth
            sx={{ minHeight: 52, boxShadow: 'none', borderWidth: 1.5, fontSize: { xs: 14, sm: 17 } }}
          >開始探索 <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>→</Box></Button>
          <Button
            type="button"
            variant="text"
            disabled={!ready || busy}
            onClick={onLocate}
            // startIcon 自動將圖示放在文字左側；onClick 仍沿用原定位函式。
            startIcon={<MyLocationIcon sx={{ color: 'text.primary' }} />}
            fullWidth
            sx={{ fontWeight: 500, fontSize: { xs: 13, sm: 14 }, justifyContent: 'center', '& .MuiButton-startIcon': { ml: 0, mr: 1 } }}
          >使用目前位置</Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
