'use client'

// 首頁互動入口：連接搜尋 Hook、Hero 畫面與金鑰設定視窗。
import { useState, type SubmitEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import {
  APILoadingStatus,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import HomeHero, { SearchCard } from './HomeHero'
import Logo from '@/components/Logo'
import KeySettings from '@/components/KeySettings'
import useKeyStore from '@/domain/key/store'
import useLocationSearch from '@/domain/map/useLocationSearch'


// 只有 Maps ready 後才掛載，因此搜尋 Hook 一定在 APIProvider 裡。
function Explorer() {
  const apiStatus = useApiLoadingStatus()
  const { query, setQuery, status, error, locate, geocodingReady } = useLocationSearch()
  const busy = status !== 'idle'
  const ready = apiStatus === APILoadingStatus.LOADED
  const failed = apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE
  // form 的 submit 同時支援按鈕與 Enter；preventDefault 阻止瀏覽器整頁提交。
  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // void 表示不在事件函式內等待；Hook 自己處理載入與錯誤。
    void locate()
  }
  function handleLocationSearch() {
    void locate(true)
  }

  return (
    <HomeHero
      feedback={
        <Stack spacing={1.5}>
          {failed && <Alert severity="error">Google Maps 載入或授權失敗。請檢查網路與金鑰設定，更新後重新載入。</Alert>}
          {!ready && !failed && <Alert severity="info">正在載入 Google Maps…</Alert>}
          {busy && <Stack direction="row" spacing={2}><CircularProgress size={22} /><Typography>{status === 'locating' ? '正在取得位置…' : '正在查詢地點…'}</Typography></Stack>}
          {error && <Alert severity="error">{error}</Alert>}
          {!geocodingReady && <Typography variant="body2">正在準備地址查詢服務；你也可以使用目前位置。</Typography>}
        </Stack>
      }
    >
      <SearchCard
        query={query}
        onQueryChange={setQuery}
        busy={busy}
        ready={ready}
        geocodingReady={geocodingReady}
        onSearch={handleSearch}
        onLocate={handleLocationSearch}
      />
    </HomeHero>
  )
}

export default function LandingPage() {
  const loading = useKeyStore((state) => state.loading)
  const ready = useKeyStore((state) => state.ready)
  // 這個開關只影響首頁的設定視窗，不必放進 Zustand。
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 3, md: 4 },
        maxWidth: 1280,
        mx: 'auto',
      }}
    >
      <Stack
        component="header"
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 0,
        }}
      >
        <Logo />
        <Button
          variant="outlined"
          onClick={() => setSettingsOpen(true)}
          sx={{ borderWidth: 1, boxShadow: 'none', bgcolor: 'transparent', fontWeight: 500 }}
        >金鑰設定</Button>
      </Stack>
      <Box component="main">
        {ready ? <Explorer /> : (
          <HomeHero
                  feedback={<Typography>{loading ? '正在載入地圖…' : '請先完成金鑰設定，再開始探索。'}</Typography>}
          >
            <SearchCard />
          </HomeHero>
        )}
      </Box>
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="settings-title"
      >
        <DialogTitle
          id="settings-title"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          設定
          <Button
            onClick={() => setSettingsOpen(false)}
            size="small"
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
