'use client'

// 第二頁互動入口：驗證 URL 座標、同步 store，再啟動附近餐廳搜尋。
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { setSearchCenter } from '@/domain/map/store'
import useKeyStore from '@/domain/key/store'
import { parseCenter, type Center } from '@/domain/map/location'
import useNearbyRestaurants from '@/domain/places/useNearbyRestaurants'
import { DEFAULT_FILTERS } from '@/domain/places/filters'
import Logo from '@/components/Logo'
import MapContainer from '@/components/MapContainer'

// 父元件給中心點和回呼；子元件不需要知道 URL 如何更新。
type NearbyExplorerProps = {
  center: Center
  onCenterChange: (center: Center) => void
}

// 搜尋狀態與資料請求集中在此；MapContainer 只負責既有資料的互動與篩選。
function NearbyExplorer({ center, onCenterChange }: NearbyExplorerProps) {
  // 同一份 restaurants 同時交給地圖標記和清單，避免資料不同步。
  // 距離由查詢層管理，選單、API 半徑與地圖範圍圈共用同一個值。
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const { status, restaurants, error, retry } = useNearbyRestaurants(center, filters.distance)
  const isLoading = status === 'library' || status === 'searching'
  const isEmpty = status === 'success' && restaurants.length === 0
  const loadingMessage = status === 'library' ? '正在載入 Places 程式庫…' : '正在搜尋附近餐廳…'

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {/* 沒有載入或錯誤訊息時隱藏狀態列，避免留下一段空白。 */}
      <Box role="status" aria-live="polite" sx={{ display: isLoading || error || isEmpty ? 'block' : 'none', flexShrink: 0, '@media (max-width: 767.98px)': { position: 'fixed', top: 'calc(env(safe-area-inset-top) + 84px)', left: 16, right: 16, zIndex: 6, bgcolor: 'background.paper', borderRadius: 2 } }}>
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
      <MapContainer filters={filters} onFiltersChange={setFilters} center={center} restaurants={restaurants} onCenterChange={onCenterChange} />
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
      // 桌面以視窗高度配置版面；扣除頁首與內距後，其餘空間交給地圖和清單。
      sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 1.5, md: 4 }, pt: { xs: 2, md: 3 }, pb: 2,
        '@media (max-width: 767.98px)': { position: 'fixed', inset: 0, height: '100dvh', p: 0, overflow: 'hidden', '& header': { display: 'none' } },
        '@media (min-width: 768px)': { height: '100dvh' },
        height: { md: '100dvh' }, minHeight: { md: 500 }, display: 'flex', flexDirection: 'column' }}
    >
      {/* minHeight: 0 允許子層縮小，讓長清單在自己的框內捲動。 */}
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          component="header"
          sx={{
            flexShrink: 0,
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
