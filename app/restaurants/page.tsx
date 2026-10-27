// 餐廳路由 /restaurants：Suspense 先顯示讀取畫面，讓內層元件讀取 URL 參數。
import { Suspense } from 'react'
import { Box, Skeleton, Typography } from '@mui/material'
import RestaurantsPage from '@/components/RestaurantsPage/RestaurantsPage'

// 靜態匯出時，URL 查詢參數交給 Suspense 內的 Client Component 讀取。
export default function Page() {
  return (
    <Suspense
      fallback={<Box sx={{ maxWidth: 880, mx: 'auto', p: 4 }}>
        <Typography role="status">正在讀取位置…</Typography><Skeleton variant="rounded" height={240} />
      </Box>}
    >
      <RestaurantsPage />
    </Suspense>
  )
}
