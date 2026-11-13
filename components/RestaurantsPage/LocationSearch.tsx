'use client'

import { useState, type SubmitEvent } from 'react'
import { Alert, Autocomplete, Box, Stack, TextField } from '@mui/material'
import useLocationSearch from '@/domain/map/useLocationSearch'
import usePlaceAutocomplete from '@/domain/map/usePlaceAutocomplete'
import type { Center } from '@/domain/map/location'

// 保留供日後使用，目前 ResultsPanel 未掛載此元件。
// 外觀保留結果頁的圓角輸入框，搜尋邏輯與首頁共用，不在既有餐廳內比對。
export default function LocationSearch({ onLocated }: { onLocated: (center: Center) => void }) {
  const { query, setQuery, status, error, locate } = useLocationSearch(onLocated)
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlacePrediction | null>(null)
  const busy = status !== 'idle'
  const autocomplete = usePlaceAutocomplete(query, !busy && !selectedPlace)

  // Enter 送出才取得座標；選取建議時先保存 Google 地點物件。
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    void locate(false, selectedPlace ?? undefined)
    autocomplete.resetSession()
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={1}>
        <Autocomplete
          freeSolo
          fullWidth
          size="small"
          disabled={busy}
          options={autocomplete.options}
          inputValue={query}
          value={null}
          clearText="清除搜尋文字"
          filterOptions={options => options}
          getOptionLabel={option => typeof option === 'string' ? option : option.text.toString()}
          getOptionKey={option => typeof option === 'string' ? option : option.placeId}
          onInputChange={(_, value, reason) => {
            if (reason === 'input' || reason === 'clear') {
              setSelectedPlace(null)
              setQuery(value)
            }
          }}
          onChange={(_, option) => {
            if (option && typeof option !== 'string') {
              setQuery(option.text.toString())
              setSelectedPlace(option)
            }
          }}
          renderInput={params => (
            <TextField
              {...params}
              placeholder="輸入地址或地標"
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '搜尋地址或地標' },
              }}
            />
          )}
        />
        {autocomplete.error && <Alert severity="warning">{autocomplete.error}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </Box>
  )
}
