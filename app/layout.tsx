// 全站共用版型：字型 → MUI 樣式快取 → 主題 → 金鑰與 Google Maps Provider → 頁面。
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import type { Metadata } from 'next'
import { Outfit, Noto_Sans_TC } from 'next/font/google'
import theme from '@/styles/theme'
import MapsGate from '@/shells/ProviderShell/MapsGate'

// next/font 在建置時下載並由網站自行提供字型；swap 先顯示備用字型。
const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
})

// 中文字型檔較大，不預先載入所有分段；瀏覽器按實際文字載入需要的字形。
const notoSansTC = Noto_Sans_TC({
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans-tc',
})

// Next.js 會將網站標題與描述轉換成頁面的 head 資訊。
export const metadata: Metadata = {
  title: 'EatWhat 今天吃什麼',
  description: '從你目前的位置開始，探索附近餐廳，為下一餐找到靈感。',
}

// 根版型包住所有頁面；LayoutProps 是 Next.js 產生的全域路由型別。
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // 把兩組 CSS 字型變數掛到 html，MUI Theme 和 Logo 都能使用。
    <html lang='zh-Hant-TW' className={`${outfit.variable} ${notoSansTC.variable}`}>
      <body>
        {/* 收集 MUI／Emotion 樣式，配合 App Router 的 HTML 輸出。 */}
        <AppRouterCacheProvider>
          {/* 提供共用主題，讓內部 MUI 元件使用一致的設計設定。 */}
          <ThemeProvider theme={theme}>
            {/* 統一瀏覽器預設樣式，再渲染目前路由的內容。 */}
            <CssBaseline />
            <MapsGate>{children}</MapsGate>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
