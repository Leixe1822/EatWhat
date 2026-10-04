import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import theme from '@/styles/theme'

// 由 next/font 管理字體，將字體名稱提供給全站主題使用。
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap', // 字體尚未載入時先顯示替代字體。
  variable: '--font-roboto',
})

// Next.js 會將網站標題與描述轉換成頁面的 head 資訊。
export const metadata: Metadata = {
  title: 'Dine Pick',
  description: 'Discover and pick the best dining experiences with Dine Pick.',
}

// 根版型包住所有頁面；LayoutProps 是 Next.js 產生的全域路由型別。
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // 指定文件語言，並讓後代元素可以使用 --font-roboto 變數。
    <html lang='zh-Hant-TW' className={`${roboto.variable}`}>
      <body>
        {/* 收集 MUI／Emotion 樣式，配合 App Router 的 HTML 輸出。 */}
        <AppRouterCacheProvider>
          {/* 提供共用主題，讓內部 MUI 元件使用一致的設計設定。 */}
          <ThemeProvider theme={theme}>
            {/* 統一瀏覽器預設樣式，再渲染目前路由的內容。 */}
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
