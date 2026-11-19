'use client'

// 手機搜尋列：管理輸入與建議選取，座標查詢交給共用 Hook。
import type { ComponentProps, SubmitEvent, SyntheticEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Autocomplete,
  Box,
  IconButton,
  TextField,
  Paper,
  type AutocompleteInputChangeReason,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import useLocationSearch from '@/domain/map/useLocationSearch'
import usePlaceAutocomplete from '@/domain/map/usePlaceAutocomplete'
import type { Center } from '@/domain/map/location'

type MobileSearchProps = {
  onLocated: (center: Center) => void
}

// freeSolo 允許自由文字，因此選項同時可能是字串或 Google 建議物件。
type SearchOption = google.maps.places.PlacePrediction | string

function getOptionLabel(option: SearchOption) {
  return typeof option === 'string' ? option : option.text.toString()
}

// 地點名稱可能重複，以 placeId 作為建議清單的穩定識別。
function getOptionKey(option: SearchOption) {
  return typeof option === 'string' ? option : option.placeId
}

// 建議清單保留資料來源標示；children 是 MUI 產生的選項內容。
function SuggestionsPaper(props: ComponentProps<typeof Paper>) {
  return (
    <Paper {...props}>
      {props.children}
      <Box sx={{ px: 2, py: 1, fontSize: 12 }}>Google Maps</Box>
    </Paper>
  )
}

// 與首頁共用地點搜尋；選建議立即搜尋，輸入自由文字則按 Enter。
export default function MobileSearch({ onLocated }: MobileSearchProps) {
  const router = useRouter()
  const { query, setQuery, status, error, locate } = useLocationSearch(onLocated)
  const isSearching = status !== 'idle'
  const suggestions = usePlaceAutocomplete(query, !isSearching)
  // 正式搜尋失敗優先顯示，其次才是建議服務錯誤。
  const searchError = error || suggestions.error

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void locate()
  }

  function handleInputChange(
    _event: SyntheticEvent,
    value: string,
    reason: AutocompleteInputChangeReason,
  ) {
    // 只同步使用者輸入，避免選取建議時的重設事件覆蓋搜尋文字。
    if (reason === 'input') setQuery(value)
  }

  function handleSuggestionSelect(_event: SyntheticEvent, option: SearchOption | null) {
    // 自由文字交給表單提交；只有地點建議會立即搜尋。
    if (!option || typeof option === 'string') return

    setQuery(option.text.toString())
    void locate(false, option)
    suggestions.resetSession()
  }

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 16,
          right: 16,
          zIndex: 5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'white',
            border: '2px solid',
            borderColor: 'divider',
            borderRadius: 4,
            boxShadow: 3,
          }}
        >
          <IconButton
            aria-label="返回首頁"
            onClick={() => router.push('/')}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Autocomplete
            freeSolo
            fullWidth
            disableClearable
            value=""
            inputValue={query}
            disabled={isSearching}
            options={suggestions.options}
            filterOptions={options => options}
            getOptionLabel={getOptionLabel}
            getOptionKey={getOptionKey}
            onInputChange={handleInputChange}
            onChange={handleSuggestionSelect}
            slots={{ paper: SuggestionsPaper }}
            slotProps={{ popper: { sx: { zIndex: 1500 } } }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder="搜尋地址或地標"
                // 外框由外層容器統一繪製，聚焦時不套用全站輸入框的光暈。
                sx={{
                  '& fieldset': { border: 'none' },
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: 'none',
                    outline: 'none',
                  },
                }}
                slotProps={{
                  ...params.slotProps,
                  htmlInput: {
                    ...params.slotProps.htmlInput,
                    'aria-label': '搜尋地址或地標',
                    enterKeyHint: 'search',
                  },
                }}
              />
            )}
          />
          <IconButton
            aria-label="清除搜尋文字"
            onClick={() => setQuery('')}
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        {searchError && <Alert severity="warning">{searchError}</Alert>}
      </Box>
      <IconButton
        aria-label="使用目前位置"
        disabled={isSearching}
        onClick={() => void locate(true)}
        sx={{
          position: 'absolute',
          zIndex: 4,
          right: 16,
          bottom:
            'min(calc(var(--sheet-size) + 24px), calc(100% - 136px - env(safe-area-inset-top)))',
          transition: theme => theme.transitions.create('bottom', {
            duration: 'var(--mobile-motion-duration)',
            easing: theme.transitions.easing.easeInOut,
          }),
          width: 48,
          height: 48,
          bgcolor: 'primary.main',
          border: '2px solid',
          borderColor: 'divider',
          boxShadow: 2,
          '&:hover': { bgcolor: 'primary.light' },
        }}
      >
        <MyLocationIcon />
      </IconButton>
    </>
  )
}
