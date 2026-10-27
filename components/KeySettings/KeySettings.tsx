'use client'

// 金鑰設定表單：草稿留在元件內，提交後才交給共用 store。
import { useState, type SubmitEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import useKeyStore, { clearSavedKey, restartMaps, setKey } from '@/domain/key/store'

export default function KeySettings() {
  // selector 只訂閱需要的欄位；欄位更新時 React 會重畫。
  const hydrated = useKeyStore(state => state.hydrated)
  const key = useKeyStore(state => state.key)
  const loading = useKeyStore(state => state.loading)
  const ready = useKeyStore(state => state.ready)
  const error = useKeyStore(state => state.error)
  const storageError = useKeyStore(state => state.storageError)
  // 密碼欄位的即時內容，不會每輸入一個字就保存金鑰。
  const [draft, setDraft] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (setKey(draft)) {
      setDraft('')
    }
  }

  return (
    <Stack spacing={2.5}>
      <Typography component="h2" variant="h6">Google Maps 金鑰設定</Typography>
      <Typography variant="body2" color="text.secondary">
        金鑰會保存在此瀏覽器的 localStorage；同來源的程式及共用此瀏覽器的人可存取。請設定網站來源限制及必要的 API 限制，避免在共用裝置保存。
        Maps 載入成功不代表 Places API (New) 已授權，搜尋錯誤會另行提示。
      </Typography>
      {!hydrated && <Typography role="status">正在讀取金鑰設定…</Typography>}
      {hydrated && !key && (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              // label="Google Maps API Key"
              type="password"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              autoComplete="off"
              fullWidth
              autoFocus
              required
              error={Boolean(error)}
              helperText="輸入後會向 Google 載入 Maps JavaScript API。"
              slotProps={{ htmlInput: { spellCheck: false, autoCapitalize: 'none' } }}
            />
            <Button type="submit" variant="contained" disabled={!draft.trim()}>載入地圖</Button>
          </Stack>
        </Box>
      )}
      {loading && <Stack direction="row" spacing={2} role="status"><CircularProgress size={24} /><Typography>正在載入 Google Maps…</Typography></Stack>}
      {ready && <Alert severity="success">Maps JavaScript API 已載入；重新整理後會使用已保存的金鑰再次載入。</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {storageError && <Alert severity="warning">{storageError}</Alert>}
      {key && (
        <Stack spacing={1}>
          <Button variant="outlined" onClick={restartMaps}>
            使用目前金鑰重新載入
          </Button>
          <Button variant="outlined" onClick={clearSavedKey}>清除已保存金鑰／重新輸入</Button>
          <Typography variant="caption" color="text.secondary">為避免同頁重複載入 Google Maps，重試需重新載入頁面，搜尋結果也會重設。</Typography>
        </Stack>
      )}
    </Stack>
  )
}
