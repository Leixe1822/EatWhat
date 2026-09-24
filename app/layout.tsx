import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import theme from '@/styles/theme'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  title: 'Dine Pick',
  description: 'Discover and pick the best dining experiences with Dine Pick.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='zh-Hant-TW' className={`${roboto.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
