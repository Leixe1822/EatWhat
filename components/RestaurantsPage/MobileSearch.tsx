'use client'

import { useRouter } from 'next/navigation'
import { Alert, Autocomplete, Box, IconButton, TextField, Paper } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import useLocationSearch from '@/domain/map/useLocationSearch'
import usePlaceAutocomplete from '@/domain/map/usePlaceAutocomplete'
import type { Center } from '@/domain/map/location'

function SuggestionsPaper(props: React.ComponentProps<typeof Paper>) {
  return <Paper {...props}>{props.children}<Box sx={{ px: 2, py: 1, fontSize: 12 }}>Google Maps</Box></Paper>
}

// 與首頁共用地點搜尋；選建議立即搜尋，輸入自由文字則按 Enter。
export default function MobileSearch({ onLocated }: {
  onLocated: (center: Center) => void
}) {
  const router = useRouter()
  const { query, setQuery, status, error, locate } = useLocationSearch(onLocated)
  const suggestions = usePlaceAutocomplete(query, status === 'idle')
  return <>
    <Box component="form" onSubmit={e => { e.preventDefault(); void locate() }}
      sx={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', left: 16, right: 16, zIndex: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'white', border: '2px solid', borderColor: 'divider', borderRadius: 4, boxShadow: 3 }}>
        <IconButton aria-label="返回首頁" onClick={() => router.push('/')} sx={{ width: 44, height: 44 }}><ArrowBackIcon /></IconButton>
        <Autocomplete freeSolo fullWidth disableClearable value="" inputValue={query}
          disabled={status !== 'idle'} options={suggestions.options}
          filterOptions={options => options}
          getOptionLabel={option => typeof option === 'string' ? option : option.text.toString()}
          getOptionKey={option => typeof option === 'string' ? option : option.placeId}
          onInputChange={(_, value, reason) => { if (reason === 'input') setQuery(value) }}
          onChange={(_, option) => {
            if (option && typeof option !== 'string') {
              setQuery(option.text.toString())
              void locate(false, option)
              suggestions.resetSession()
            }
          }}
          slots={{ paper: SuggestionsPaper }}
          slotProps={{ popper: { sx: { zIndex: 1500 } } }}
          renderInput={params => <TextField {...params} placeholder="搜尋地址或地標"
            // 外框由外層容器統一繪製，聚焦時不套用全站輸入框的光暈。
            sx={{
              '& fieldset': { border: 'none' },
              '& .MuiOutlinedInput-root.Mui-focused': {
                boxShadow: 'none',
                outline: 'none',
              },
            }}
            slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '搜尋地址或地標', enterKeyHint: 'search' } }} />}
        />
        <IconButton aria-label="清除搜尋文字" onClick={() => setQuery('')} sx={{ width: 44, height: 44 }}><CloseIcon /></IconButton>
      </Box>
      {(error || suggestions.error) && <Alert severity="warning">{error || suggestions.error}</Alert>}
    </Box>
    <IconButton aria-label="使用目前位置" disabled={status !== 'idle'} onClick={() => void locate(true)}
      sx={{ position: 'absolute', zIndex: 4, right: 16, bottom: 'min(calc(var(--sheet-size) + 24px), calc(100% - 136px - env(safe-area-inset-top)))',
        width: 48, height: 48, bgcolor: 'primary.main', border: '2px solid', borderColor: 'divider',
        boxShadow: 2, '&:hover': { bgcolor: 'primary.light' } }}>
      <MyLocationIcon />
    </IconButton>
  </>
}
