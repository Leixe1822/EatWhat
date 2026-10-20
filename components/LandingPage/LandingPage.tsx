'use client'
import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  APILoadingStatus,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import APIProviderShell from '@/shells/ProviderShell/APIProvider'
import KeySettings from '@/components/KeySettings'
import MapContainer from '@/components/MapContainer'
import useKeyStore, { hydrateKey } from '@/domain/key/store'
import usePlacesStore, {
  pickRestaurant,
  searchRestaurants,
  selectRestaurant,
  setQuery,
} from '@/domain/places/store'

function Explorer() {
  const apiStatus = useApiLoadingStatus()
  const query = usePlacesStore((state) => state.query)
  const status = usePlacesStore((state) => state.status)
  const error = usePlacesStore((state) => state.error)
  const restaurants = usePlacesStore((state) => state.restaurants)
  const selectedId = usePlacesStore((state) => state.selectedId)
  const busy = status === 'searching' || status === 'locating'
  const ready = apiStatus === APILoadingStatus.LOADED
  const failed =
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ready && !busy) {
      void searchRestaurants()
    }
  }

  function handleLocationSearch() {
    void searchRestaurants(true)
  }

  let resultMessage = '附近沒有符合的餐廳，請換個地點試試。'
  if (restaurants.length > 0) {
    resultMessage = `找到 ${restaurants.length} 間餐廳`
  }

  return (
    <Stack spacing={4}>
      {failed ? (
        <Alert severity="error">
          Google Maps 載入或授權失敗。請檢查網路與金鑰設定，更新後重新載入。
        </Alert>
      ) : (
        !ready && (
          <Alert severity="info">
            正在載入 Google Maps… 若持續無法載入，請檢查網路或重新設定金鑰。
          </Alert>
        )
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 4, md: 8 },
          alignItems: 'center',
        }}
      >
        <Stack spacing={3}>
          <Typography
            component="h1"
            variant="h2"
            sx={{ fontSize: { xs: 36, md: 56 }, fontWeight: 700 }}
          >
            今天吃什麼？
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 20 }}>
            從你目前的位置開始，探索附近的美食！
          </Typography>
          <Box component="form" onSubmit={handleSearch}>
            <Stack spacing={3}>
              <TextField
                label="地址或地標"
                placeholder="例如：台北 101"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="outlined"
                  disabled={!ready || busy}
                  onClick={handleLocationSearch}
                >
                  使用目前位置
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={!ready || busy || !query.trim()}
                >
                  開始尋找餐廳
                </Button>
              </Stack>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary">
            探索中心點周圍 1 公里，最多顯示 20 間餐廳。
          </Typography>
          <Box role="status" aria-live="polite">
            {busy && (
              <Stack direction="row" spacing={2}>
                <CircularProgress size={22} />
                <Typography>
                  {status === 'locating' ? '正在取得位置…' : '正在尋找餐廳…'}
                </Typography>
              </Stack>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {status === 'success' && <Typography>{resultMessage}</Typography>}
          </Box>
        </Stack>
        {ready ? (
          <MapContainer />
        ) : (
          <Box
            sx={{
              minHeight: 360,
              bgcolor: 'action.hover',
              borderRadius: 4,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography>地圖將顯示在這裡</Typography>
          </Box>
        )}
      </Box>
      {restaurants.length > 0 && (
        <Stack component="section" spacing={2} aria-label="餐廳搜尋結果">
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography component="h2" variant="h5">
              附近餐廳
            </Typography>
            <Button variant="contained" onClick={pickRestaurant}>
              幫我選一間
            </Button>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {restaurants.map((restaurant) => (
              <Stack
                key={restaurant.id}
                spacing={1}
                sx={{
                  p: 3,
                  border: '2px solid',
                  borderColor:
                    restaurant.id === selectedId
                      ? 'primary.main'
                      : 'secondary.main',
                  borderRadius: 3,
                }}
              >
                <Typography component="h3" variant="h6">
                  {restaurant.name}
                </Typography>
                <Typography variant="body2">{restaurant.address}</Typography>
                <Typography variant="body2">
                  {restaurant.rating === null
                    ? '尚無評分'
                    : `★ ${restaurant.rating}`}
                </Typography>
                <Button
                  onClick={() => selectRestaurant(restaurant.id)}
                  aria-pressed={restaurant.id === selectedId}
                >
                  {restaurant.id === selectedId
                    ? '已選擇 · 地圖位置'
                    : '在地圖上查看'}
                </Button>
                {restaurant.uri && (
                  <Link
                    href={restaurant.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    在 Google Maps 開啟
                  </Link>
                )}
              </Stack>
            ))}
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
export default function LandingPage() {
  const key = useKeyStore((state) => state.key)
  const loading = useKeyStore((state) => state.loading)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    hydrateKey()
  }, [])
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        p: { xs: 3, md: 6 },
        maxWidth: 1500,
        mx: 'auto',
      }}
    >
      <Stack
        component="header"
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: { xs: 6, md: 10 },
        }}
      >
        <Typography
          component="a"
          href="./"
          color="inherit"
          sx={{
            fontSize: 28,
            fontWeight: 700,
            fontStyle: 'italic',
            textDecoration: 'none',
          }}
        >
          Dine Pick
        </Typography>
        {key && <Button onClick={() => setSettingsOpen(true)}>金鑰設定</Button>}
      </Stack>
      <Box component="main">
        {loading && (
          <Stack role="status" direction="row" spacing={2}>
            <CircularProgress size={24} />
            <Typography>正在還原設定…</Typography>
          </Stack>
        )}
        {!loading && key && (
          <APIProviderShell apiKey={key} language="zh-TW" region="TW">
            <Explorer />
          </APIProviderShell>
        )}
        {!loading && !key && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Stack spacing={3}>
              <Chip
                label="讓每一餐，都少一點猶豫"
                sx={{ alignSelf: 'start' }}
              />
              <Typography
                component="h1"
                sx={{ fontSize: { xs: 40, md: 60 }, fontWeight: 700 }}
              >
                今天吃什麼？
              </Typography>
              <Typography sx={{ fontSize: 20 }}>
                從你目前的位置開始，探索附近的美食！
              </Typography>
              <Typography color="text.secondary">
                設定金鑰 → 輸入地點或定位 → 探索附近餐廳
              </Typography>
            </Stack>
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                border: '2px solid',
                borderColor: 'secondary.main',
                borderRadius: 4,
              }}
            >
              <KeySettings />
            </Box>
          </Box>
        )}
      </Box>
      <Box component="footer" sx={{ mt: 8 }}>
        <Typography variant="body2" color="text.secondary">
          Dine Pick · 今天的美食，從這裡開始
        </Typography>
      </Box>
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          設定
          <Button
            onClick={() => setSettingsOpen(false)}
            sx={{ float: 'right' }}
          >
            關閉
          </Button>
        </DialogTitle>
        <DialogContent>
          <KeySettings />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
