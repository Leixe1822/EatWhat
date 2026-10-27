// 首頁路由 /：只組裝畫面；輸入與按鈕事件放在 LandingPage。
import LandingPage from '@/components/LandingPage'

// 頁面入口保留 Server Component，互動搜尋由 LandingPage 處理。
export default function HomePage() {
  return <LandingPage />
}
