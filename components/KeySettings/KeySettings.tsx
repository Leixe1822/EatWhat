'use client'
import { useState, type FormEvent, type ChangeEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import useKeyStore, {
  clearKey,
  isKeyFormatValid,
  setKey,
} from '@/domain/key/store'

export default function KeySettings() {
  const key = useKeyStore((state) => state.key)
  const storageError = useKeyStore((state) => state.storageError)
  const [draft, setDraft] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState(false)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isKeyFormatValid(draft)) {
      setError(true)
      return
    }
    const saved = setKey(draft)
    if (saved) {
      window.location.reload()
    }
  }

  function handleKeyChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value)
    setError(false)
  }

  function handleClearKey() {
    const cleared = clearKey()
    if (cleared) {
      window.location.reload()
    }
  }

  function toggleVisible() {
    setVisible(!visible)
  }

  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        Google Maps 金鑰設定
      </Typography>
      <Typography variant="body2" color="text.secondary">
        啟用 Maps JavaScript API 與 Places API
        (New)，即可探索附近餐廳。金鑰只儲存在此瀏覽器；遮罩不等於加密，請設定網站來源限制。
      </Typography>
      {key && (
        <Alert severity="info">
          已儲存金鑰 ••••{key.slice(-4)}。更換或清除後會重新載入頁面。
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label={key ? '新的 API Key' : 'Google Maps API Key'}
            value={draft}
            onChange={handleKeyChange}
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            fullWidth
            error={error}
            helperText={
              error
                ? '請輸入以 AIza 開頭、共 39 字元的金鑰。'
                : '格式通過後仍需由 Google 確認 API 權限。'
            }
            slotProps={{
              htmlInput: { spellCheck: false, autoCapitalize: 'none' },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={toggleVisible} aria-pressed={visible}>
                      {visible ? '隱藏' : '顯示'}
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained">
              儲存並載入
            </Button>
            {key && <Button onClick={handleClearKey}>清除金鑰</Button>}
          </Stack>
        </Stack>
      </Box>
      {storageError && <Alert severity="error">{storageError}</Alert>}
    </Stack>
  )
}
