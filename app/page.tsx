'use client'

import NextLink from 'next/link'
import { Box, Button, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material'

// 首頁使用 MUI 元件與 sx；Client 邊界允許 Link 組合 Next.js 導航元件。
export default function HomePage() {
  return (
    <Box component='main' sx={{
      minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary',
      p: { xs: 2, md: '24px clamp(20px, 5.5vw, 96px)' },
    }}>
      <Stack sx={{ width: '100%', maxWidth: 1680, minHeight: { xs: 'calc(100dvh - 32px)', md: 'calc(100dvh - 48px)' }, mx: 'auto' }}>
        <Box component='header' sx={theme => ({
          p: { xs: '28px 32px', md: '38px 52px' },
          [theme.breakpoints.down(481)]: { p: 3 },
        })}>
          <Link component={NextLink} href='/' aria-label='Dine Pick 首頁' underline='none' color='inherit' sx={theme => ({
            display: 'inline-block', fontSize: 30, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-1px',
            [theme.breakpoints.down(481)]: { fontSize: 26 },
          })}>
            Dine Pick
          </Link>
        </Box>

        {/* 桌機保留右側視覺空間；手機改成單欄，沿用原本的版面比例。 */}
        <Box sx={theme => ({
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'center', flex: 1,
          gap: 'clamp(32px, 4vw, 76px)', p: { xs: '64px 32px 96px', md: '64px clamp(40px, 6vw, 120px) 120px' },
          [theme.breakpoints.down(481)]: { p: '40px 20px 64px' },
        })}>
          <Box component='section' aria-labelledby='home-title' sx={{ minWidth: 0, width: '100%', maxWidth: { xs: 600, md: 'none' }, mx: 'auto' }}>
            <Typography id='home-title' component='h1' variant='h1' sx={{ fontSize: { xs: 'clamp(32px, 6vw, 52px)', md: 'clamp(36px, 3.6vw, 68px)' }, fontWeight: 700, lineHeight: 1.35, letterSpacing: '0.08em' }}>
              今天吃什麼？
            </Typography>
            <Typography component='p' sx={theme => ({
              mt: '22px', fontSize: { xs: 18, md: 'clamp(16px, 1.45vw, 26px)' }, fontWeight: 600, lineHeight: 1.8, letterSpacing: '0.04em',
              [theme.breakpoints.down(481)]: { fontSize: 16 },
            })}>
              從你目前的位置開始，探索附近的美食！
            </Typography>

            <Box sx={{ mt: { xs: 5, md: 8 } }}>
              {/* 使用 TextField 的插槽放入裝飾，保留輸入框的無障礙名稱。 */}
              <TextField
                fullWidth
                name='address'
                placeholder='輸入地址、地標 ⋯'
                autoComplete='street-address'
                slotProps={{
                  htmlInput: { 'aria-label': '輸入地址或地標' },
                  input: {
                    startAdornment: <InputAdornment position='start'><Box component='span' aria-hidden='true' sx={{ fontSize: 26 }}>📍</Box></InputAdornment>,
                  },
                }}
                sx={theme => ({
                  '& .MuiOutlinedInput-root': {
                    minHeight: { xs: 80, md: 100 }, p: '20px 24px', borderRadius: '26px',
                    fontSize: { xs: 18, md: 'clamp(16px, 1.4vw, 24px)' }, fontWeight: 600, letterSpacing: '0.04em',
                    [theme.breakpoints.down(481)]: { p: '16px 12px', borderRadius: '20px' },
                  },
                  '& .MuiOutlinedInput-input': { p: 0 },
                  '& .MuiOutlinedInput-notchedOutline': { borderWidth: 3, borderColor: 'divider' },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 3, borderColor: 'divider' },
                })}
              />
              {/* 保留既有外框；定位與搜尋仍待接入業務邏輯。 */}
              <Box sx={theme => ({
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', mt: 4,
                '& .MuiButton-root': {
                  minWidth: 0, minHeight: { xs: 72, md: 72 }, p: '14px 12px', borderRadius: '18px',
                  fontSize: { xs: 18, md: 'clamp(15px, 1.35vw, 24px)' },
                },
                [theme.breakpoints.down(481)]: {
                  gap: 1.5, mt: 2.5,
                  '& .MuiButton-root': { minHeight: 64, p: '12px 6px', fontSize: 15, borderRadius: '14px' },
                },
              })}>
                <Button variant='outlined' type='button'>使用目前位置</Button>
                <Button variant='contained' type='button'>開始尋找餐廳</Button>
              </Box>
            </Box>
          </Box>
          <Box aria-hidden='true' sx={{ display: { xs: 'none', md: 'block' } }} />
        </Box>
      </Stack>
    </Box>
  )
}
