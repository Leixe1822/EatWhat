'use client'

// 首頁需要表單事件與 React hook，因此宣告為 Client Component。
import MapContainer from '@/components/MapContainer'
import useKeyStore, { setKey } from '@/domain/key/store'
import { APIProvider } from '@/shells/ProviderShell'
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Stack,
  Button,
} from '@mui/material'
import { useState } from 'react'

// PageProps 是 Next.js 依路由產生的全域型別；此頁對應根路徑 /。
const HomePage: React.FC<PageProps<'/'>> = () => {
  // 分別訂閱所需欄位；loading 表示 Key 的儲存資料尚未還原，並非地圖載入中。
  const loading = useKeyStore(s => s.loading)
  const apiKey = useKeyStore(s => s.key)

  // 改變表單的 React key，讓表單重新掛載並清空非受控的輸入欄位。
  const [formVersion, setFormVersion] = useState(0)

  // 將輸入的 Key 寫入共用 store；persist 中介層會負責持久化。
  const handleKeySubmit = (e: React.SubmitEvent) => {
    // 阻止瀏覽器提交表單後重新載入頁面。
    e.preventDefault()
    // FormData 依欄位的 name 取得值；此表單的 apiKey 欄位是文字輸入。
    const formData = new FormData(e.target)
    const apiKey = formData.get('apiKey') as string
    setKey(apiKey)
    setFormVersion(prev => prev + 1)
  }

  return (
    <Container
      sx={{
        // 以動態視窗高度作為容器高度，padding 也包含在尺寸內。
        boxSizing: 'border-box',
        height: '100dvh',
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // 標題、表單維持原尺寸，只有 main 伸縮以填滿剩餘空間。
        '& > *': { flexGrow: 0, flexShrink: 0 },
        '& > main': { flexGrow: 1, flexShrink: 1, overflow: 'auto' },
      }}
    >
      {/* 視覺使用 h4 字級，語意上仍是頁面的主要標題 h1。 */}
      <Typography variant='h4' component='h1'>
        Welcome to Dine Pick
      </Typography>
      {/* Paper 實際輸出 form；formVersion 與 Google API Key 是不同用途。 */}
      <Paper
        component='form'
        onSubmit={handleKeySubmit}
        key={formVersion}
        sx={{ py: 2 }}
        elevation={0}
      >
        <Stack direction='row' spacing={2} sx={{ alignItems: 'stretch' }}>
          {/* name 對應 FormData 的讀取鍵；required 提供瀏覽器的必填驗證。 */}
          <TextField
            label='API Key'
            variant='outlined'
            size='small'
            fullWidth
            name='apiKey'
            required
            sx={{ flexShrink: 1, flexGrow: 1 }}
          />
          {/* submit 會觸發外層表單的 onSubmit；按鈕不隨剩餘寬度伸縮。 */}
          <Button
            type='submit'
            size='small'
            variant='contained'
            color='primary'
            disableElevation
            sx={{ flexShrink: 0, flexGrow: 0 }}
          >
            Submit
          </Button>
        </Stack>
      </Paper>
      <Box component='main' sx={{ mt: 2, borderRadius: 2, overflow: 'hidden' }}>
        {/* 依儲存資料還原狀態與 Key 是否存在，切換提示或地圖。 */}
        {loading && <Typography>Loading API key...</Typography>}
        {!loading && apiKey && (
          // 有 Key 才掛載 Provider，讓其子元件可以載入 Google Maps。
          <APIProvider apiKey={apiKey}>
            <MapContainer />
          </APIProvider>
        )}
        {!loading && !apiKey && (
          <Typography variant='caption'>
            Enter your API key to continue.
          </Typography>
        )}
      </Box>
    </Container>
  )
}

export default HomePage
