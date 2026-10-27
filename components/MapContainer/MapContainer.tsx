'use client'

// 餐廳地圖：共用一份餐廳資料來產生標記、清單與資訊視窗。
import { useEffect, useRef, useState } from 'react'
import { Box, Stack, Typography, useTheme, useMediaQuery } from '@mui/material'
import { AdvancedMarker, InfoWindow, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import ResultsPanel from '@/components/RestaurantsPage/ResultsPanel'
import useMapStore, { setMap } from '@/domain/map/store'
import { isValidCenter, type Center } from '@/domain/map/location'
import type { Restaurant } from '@/domain/places/store'
import { SEARCH_RADIUS } from '@/domain/places/nearby'
import { MAP_ID } from './config'

// Google Circle 不是 React 元件；effect 建立它，cleanup 負責從地圖移除。
function SearchRange({ center }: { center: Center }) {
  const map = useMap()
  // 記住哪張地圖已縮放過；拖曳中心點時不再自動重設 Zoom。
  const fittedMap = useRef<google.maps.Map | null>(null)
  const maps = useMapsLibrary('maps')
  const theme = useTheme()
  const { lat, lng } = center
  useEffect(() => {
    setMap(map)
    return () => {
      setMap(null)
    }
  }, [map])
  useEffect(() => {
    if (!map || !maps) {
      return
    }
    const circle = new maps.Circle({
      map,
      center: { lat, lng },
      radius: SEARCH_RADIUS,
      fillColor: theme.palette.primary.main,
      fillOpacity: 0.12,
      strokeColor: theme.palette.secondary.main,
      strokeOpacity: 0.7,
      strokeWeight: 2,
      clickable: false,
    })
    const bounds = circle.getBounds()
    if (bounds && fittedMap.current !== map) {
      map.fitBounds(bounds, 32)
      fittedMap.current = map
    }
    return () => circle.setMap(null)
  }, [map, maps, lat, lng, theme.palette.primary.main, theme.palette.secondary.main])
  return null
}

type MapContainerProps = {
  center: Center
  restaurants: Restaurant[]
  onCenterChange: (center: Center) => void
}
type RestaurantSelection = {
  id: string
  results: Restaurant[] // 記住選取時的資料批次；新搜尋不沿用舊選取。
}

export default function MapContainer({ center, restaurants, onCenterChange }: MapContainerProps) {
  const [selection, setSelection] = useState<RestaurantSelection | null>(null)
  // null 表示尚未手動切換：桌面預設展開，手機預設收合。
  const [listOpen, setListOpen] = useState<boolean | null>(null)
  const map = useMapStore(state => state.map)
  // 新搜尋使用新的結果陣列，舊選取項目立即失效。
  let selected: Restaurant | undefined
  if (selection && selection.results === restaurants) {
    selected = restaurants.find(restaurant => restaurant.id === selection.id)
  }
  // 清單和標記都呼叫這個函式，確保資訊視窗與地圖位置同步。

  function selectRestaurant(restaurant: Restaurant) {
    setSelection({ id: restaurant.id, results: restaurants })
    map?.panTo(restaurant.location)
    if (!desktop) {
      setListOpen(false)
    }
  }
  function toggleRestaurantList() {
    setListOpen(previousOpen => !(previousOpen ?? desktop))
  }

  function handleCenterDragEnd(event: google.maps.MapMouseEvent) {
    const newCenter = event.latLng?.toJSON()
    if (!newCenter || !isValidCenter(newCenter)) {
      return
    }
    setSelection(null)
    onCenterChange(newCenter)
  }

  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  // 尚未手動切換時依螢幕大小決定；切換後保留使用者的選擇。
  const panelOpen = listOpen ?? desktop
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: panelOpen ? '340px minmax(0, 1fr)' : '72px minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
      <ResultsPanel restaurants={restaurants} selectedId={selected?.id} open={panelOpen} onToggle={toggleRestaurantList} onSelect={selectRestaurant} />
      <Box sx={{ minWidth: 0, height: { xs: '65dvh', md: 'calc(100dvh - 190px)' }, minHeight: 360, border: '2px solid', borderColor: 'divider', borderRadius: '24px', overflow: 'hidden' }}>
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={12}
          disableDefaultUI
          zoomControl
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          gestureHandling="cooperative"
        >
          {/* 只在標記拖曳結束更新搜尋位置，地圖平移不寫入中心點。 */}
          <AdvancedMarker
            position={center}
            draggable
            zIndex={10}
            title="搜尋中心：拖曳以搜尋附近餐廳"
            onDragEnd={handleCenterDragEnd}
          >
            <Stack sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: 'primary.main',
                  color: 'text.primary',
                  border: '2px solid',
                  borderColor: 'secondary.main',
                  borderRadius: 2,
                  px: 1,
                  fontWeight: 800
                }}
              >搜尋中心 ↔</Box>
              <LocationOnIcon sx={{ fontSize: 64, color: 'primary.main', stroke: 'var(--mui-palette-divider)', strokeWidth: 1, display: 'block' }} />
            </Stack>
          </AdvancedMarker>
          <SearchRange center={center} />
          {/* map 把每間餐廳轉成一個標記；key 讓 React 辨認各個項目。 */}
          {restaurants.map(restaurant => (
            <AdvancedMarker
              key={restaurant.id}
              position={restaurant.location}
              title={restaurant.name}
              onClick={() => selectRestaurant(restaurant)}
              zIndex={selected?.id === restaurant.id ? 2 : 1}
            >
              <LocationOnIcon sx={{ fontSize: selected?.id === restaurant.id ? 46 : 38, color: 'secondary.main', stroke: 'var(--mui-palette-background-paper)', strokeWidth: 0.7, display: 'block' }} />
            </AdvancedMarker>
          ))}
          {/* 只有選中餐廳時才建立 InfoWindow；關閉只清空 selection。 */}
          {selected && (
            <InfoWindow
              key={selected.id}
              position={selected.location}
              pixelOffset={[0, -40]}
              maxWidth={280}
              headerContent={selected.name}
              onClose={() => setSelection(null)}
            >
              <Stack
                spacing={1}
                sx={{
                  p: 1.5,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '12px',
                  maxWidth: 240,
                  overflowWrap: 'anywhere'
                }}
              >
                <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>{selected.name}</Typography>
                <Typography variant="body2">{selected.address}</Typography>
                <Typography variant="body2">{selected.rating === null ? '尚無評分' : `評分：${selected.rating} / 5`}</Typography>
              </Stack>
            </InfoWindow>
          )}
        </Map>
      </Box>
    </Box>
  )
}
