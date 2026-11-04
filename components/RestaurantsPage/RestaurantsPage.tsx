'use client'

// 第二頁互動入口：驗證 URL 座標、同步 store，再啟動附近餐廳搜尋。
import { useEffect, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { setSearchCenter } from '@/domain/map/store'
import useKeyStore from '@/domain/key/store'
import { parseCenter, type Center } from '@/domain/map/location'
import useNearbyRestaurants from '@/domain/places/useNearbyRestaurants'
import Logo from '@/components/Logo'
import MapContainer from '@/components/MapContainer'

// 父元件給中心點和回呼；子元件不需要知道 URL 如何更新。
type NearbyExplorerProps = {
  center: Center
  onCenterChange: (center: Center) => void
}

function NearbyExplorer({ center, onCenterChange }: NearbyExplorerProps) {
  // 同一份 restaurants 同時交給地圖標記和清單，避免資料不同步。
  const { status, restaurants, error, retry } = useNearbyRestaurants(center)
  const isLoading = status === 'library' || status === 'searching'
  const isEmpty = status === 'success' && restaurants.length === 0
  const loadingMessage = status === 'library' ? '正在載入 Places 程式庫…' : '正在搜尋附近餐廳…'

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip label="半徑 3 公里" />
        <Chip label={`本次結果 ${restaurants.length} 間 · 最多 20 筆`} />
      </Stack>
      <Box role="status" aria-live="polite">
        {isLoading && (
          <Stack direction="row" spacing={2}>
            <CircularProgress size={22} />
            <Typography>{loadingMessage}</Typography>
          </Stack>
        )}
        {error && (
          <Alert severity="error" action={<Button onClick={retry}>重試</Button>}>
            {error}
          </Alert>
        )}
        {isEmpty && (
          <Alert severity="info">這次沒有取得餐廳結果，請拖曳中心標記選擇其他地點。</Alert>
        )}
      </Box>
      <MapContainer center={center} restaurants={restaurants} onCenterChange={onCenterChange} />
    </Stack>
  )
}

export default function RestaurantsPage() {
  // URL 是重新整理後的位置來源；先驗證再放進 store。
  const searchParams = useSearchParams()
  const router = useRouter()
  const isKeyReady = useKeyStore(state => state.ready)
  const center = parseCenter(searchParams)
  const lat = center?.lat
  const lng = center?.lng

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setSearchCenter({ lat, lng })
    } else {
      setSearchCenter(null)
    }
  }, [lat, lng])

  function handleCenterChange(center: Center) {
    setSearchCenter(center)
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.set('lat', String(center.lat))
    nextSearchParams.set('lng', String(center.lng))
    // Next.js 整合原生 History API；更新 URL 而不重建地圖。
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${nextSearchParams}${window.location.hash}`,
    )
  }

  // 用 if / else 決定內容，比 JSX 裡連續三元判斷容易閱讀。
  let pageContent: ReactNode

  if (!center) {
    pageContent = <Alert severity="warning">網址缺少有效座標，請返回首頁重新選擇地點。</Alert>
  } else if (!isKeyReady) {
    pageContent = <Typography role="status">請先完成 Google Maps 金鑰設定。</Typography>
  } else {
    pageContent = <NearbyExplorer center={center} onCenterChange={handleCenterChange} />
  }

  return (
    <Box
      component="main"
      sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 1.5, md: 4 }, py: { xs: 2, md: 3 } }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          component="header"
          sx={{
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton
              aria-label="返回首頁選擇地點"
              onClick={() => router.push('/')}
              sx={{ border: '1px solid', borderColor: 'divider', color: 'text.primary' }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Logo />
          </Stack>
        </Stack>
        {pageContent}
      </Stack>
    </Box>
  )
}
