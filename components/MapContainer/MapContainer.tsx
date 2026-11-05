'use client'

// 餐廳地圖：共用一份餐廳資料來產生標記、清單與資訊視窗。
import { useEffect, useRef, useState } from 'react'
import { Box, Button, Chip, IconButton, Stack, Typography, useTheme, useMediaQuery } from '@mui/material'
import { AdvancedMarker, InfoWindow, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import { DEFAULT_FILTERS, filterRestaurants } from '@/domain/places/filters'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import ResultsPanel from '@/components/RestaurantsPage/ResultsPanel'
import useMapStore, { setMap } from '@/domain/map/store'
import { isValidCenter, type Center } from '@/domain/map/location'
import type { Restaurant } from '@/domain/places/store'
import { MAP_ID } from './config'

// Google Circle 不是 React 元件；effect 建立它，cleanup 負責從地圖移除。
function SearchRange({ center, radius }: { center: Center; radius: number }) {
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
      radius,
      fillColor: theme.palette.primary.main,
      fillOpacity: 0.12,
      strokeColor: theme.palette.secondary.main,
      strokeOpacity: 0.7,
      strokeWeight: 2,
      clickable: false,
    })
    // 首次掛載才縮放至範圍圈；後續改篩選保留使用者目前的視角。
    const bounds = circle.getBounds()
    if (bounds && fittedMap.current !== map) {
      map.fitBounds(bounds, 32)
      fittedMap.current = map
    }
    return () => circle.setMap(null)
  }, [map, maps, lat, lng, radius, theme.palette.primary.main, theme.palette.secondary.main])
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
  // 篩選狀態只留在地圖容器；同一份篩選結果同時驅動清單、筆數與標記。
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const filteredRestaurants = filterRestaurants(restaurants, center, filters)
  const [selection, setSelection] = useState<RestaurantSelection | null>(null)
  // null 表示尚未手動切換：桌面預設展開，手機預設收合。
  const [listOpen, setListOpen] = useState<boolean | null>(null)
  const map = useMapStore(state => state.map)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  // 尚未手動切換時依螢幕大小決定；切換後保留使用者的選擇。
  const panelOpen = listOpen ?? isDesktop

  // 新搜尋使用新的結果陣列，舊選取項目立即失效。
  let selectedRestaurant: Restaurant | undefined
  if (selection && selection.results === restaurants) {
    // 被篩選排除的餐廳不顯示資訊視窗，但不修改原始資料批次。
    selectedRestaurant = filteredRestaurants.find(restaurant => restaurant.id === selection.id)
  }

  // 清單和標記都呼叫這個函式，確保資訊視窗與地圖位置同步。
  function selectRestaurant(restaurant: Restaurant) {
    setSelection({ id: restaurant.id, results: restaurants })
    map?.panTo(restaurant.location)
    if (!isDesktop) {
      setListOpen(false)
    }
  }

  // 從本次完整結果等機率抽一間，不額外呼叫 API。
  // 清除篩選，確保抽中的餐廳即使原先被隱藏，也能顯示標記及資訊視窗。
  function selectRandomRestaurant() {
    if (restaurants.length === 0) return
    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)]
    setFilters({ ...DEFAULT_FILTERS })
    selectRestaurant(restaurant)
  }

  // 第一次切換從目前螢幕預設狀態反轉，之後沿用使用者的手動選擇。
  function toggleRestaurantList() {
    setListOpen(previousOpen => !(previousOpen ?? isDesktop))
  }

  // 拖曳中心標記才觸發新搜尋；先驗證 Google 事件中的座標。
  function handleCenterDragEnd(event: google.maps.MapMouseEvent) {
    const newCenter = event.latLng?.toJSON()
    if (!newCenter || !isValidCenter(newCenter)) {
      return
    }
    setSelection(null)
    onCenterChange(newCenter)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        flex: 1,
        minHeight: { xs: 0, md: 360 },
        gridTemplateRows: { md: 'minmax(0, 1fr)' },
        // 手機上下排列時共用固定可視高度；桌面填滿同一個 Grid 列。
        '--panel-height': { xs: 'max(360px, 65dvh)', md: '100%' },
        // 收合時只保留地圖一欄，按鈕以絕對定位疊在地圖內。
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: panelOpen ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)',
        },
        gap: 2,
        alignItems: 'stretch',
      }}
    >
      <ResultsPanel
        restaurants={filteredRestaurants}
        allRestaurants={restaurants}
        filters={filters}
        onFiltersChange={setFilters}
        selectedId={selectedRestaurant?.id}
        open={panelOpen}
        onSelect={selectRestaurant}
        onRandomSelect={selectRandomRestaurant}
      />
      <Box
        sx={{
          position: 'relative',
          minWidth: 0,
          height: 'var(--panel-height)',
          minHeight: 0,
          border: '2px solid',
          borderColor: 'divider',
          borderRadius: '24px',
          overflow: 'hidden',
        }}
      >
        {/* 展開時貼左側中央；收合時移到左上角，並保留鍵盤可操作的按鈕。 */}
        <IconButton
          onClick={toggleRestaurantList}
          aria-label={panelOpen ? '收合搜尋結果' : '展開搜尋結果'}
          aria-expanded={panelOpen}
          aria-controls="restaurant-results"
          sx={{ position: 'absolute', zIndex: 1, left: panelOpen ? 0 : 12,
            top: panelOpen ? '50%' : 12, transform: panelOpen ? 'translateY(-50%)' : 'none',
            bgcolor: 'background.paper', boxShadow: 3,
            '&:hover': { bgcolor: 'primary.light' } }}
        >
          {panelOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
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
                  fontWeight: 800,
                }}
              >
                搜尋中心 ↔
              </Box>
              <LocationOnIcon
                sx={{
                  fontSize: 64,
                  color: 'primary.main',
                  stroke: 'var(--mui-palette-divider)',
                  strokeWidth: 1,
                  display: 'block',
                }}
              />
            </Stack>
          </AdvancedMarker>
          {/* 範圍圈跟隨距離選單；改半徑只更新圈，不額外呼叫附近搜尋。 */}
          <SearchRange center={center} radius={filters.distance} />
          {/* map 把每間餐廳轉成一個標記；key 讓 React 辨認各個項目。 */}
          {filteredRestaurants.map(restaurant => (
            <AdvancedMarker
              key={restaurant.id}
              position={restaurant.location}
              title={restaurant.name}
              onClick={() => selectRestaurant(restaurant)}
              zIndex={selectedRestaurant?.id === restaurant.id ? 2 : 1}
            >
              <LocationOnIcon
                sx={{
                  fontSize: selectedRestaurant?.id === restaurant.id ? 46 : 38,
                  color: 'secondary.main',
                  stroke: 'var(--mui-palette-background-paper)',
                  strokeWidth: 0.7,
                  display: 'block',
                }}
              />
            </AdvancedMarker>
          ))}
          {/* 只有選中餐廳時才建立 InfoWindow；關閉只清空 selection。 */}
          {selectedRestaurant && (
            <InfoWindow
              key={selectedRestaurant.id}
              position={selectedRestaurant.location}
              pixelOffset={[0, -40]}
              maxWidth={320}
              ariaLabel={selectedRestaurant.name}
              headerContent={<Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5 }}>餐廳資訊</Typography>}
              onClose={() => setSelection(null)}
            >
              {/* 延續品牌的深色邊框與硬陰影，評分以酸橙綠標籤強調。 */}
              <Stack
                spacing={2}
                sx={{
                  p: 2,
                  m: 0.5,
                  mb: 1,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '20px',
                  boxShadow: '3px 3px 0 var(--mui-palette-divider)',
                  maxWidth: 272,
                  overflowWrap: 'anywhere',
                }}
              >
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
                  {selectedRestaurant.name}
                </Typography>
                {/* 評分與營業狀態並排顯示。 */}
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    icon={<StarRoundedIcon />}
                    label={selectedRestaurant.rating === null ? '尚無評分' : `${selectedRestaurant.rating}`}
                    sx={{
                      alignSelf: 'flex-start',
                      bgcolor: selectedRestaurant.rating === null ? 'action.hover' : 'primary.main',
                      color: 'text.primary',
                      fontWeight: 800,
                      border: '1px solid',
                      borderColor: 'divider',
                      '& .MuiChip-icon': { color: 'text.primary' },
                    }}
                  />
                  {/* 僅以已取得的營業狀態顯示；缺值不能當成休息中。 */}
                  <Chip
                    label={selectedRestaurant.openNow == null
                      ? '營業狀態未知'
                      : selectedRestaurant.openNow ? '營業中' : '休息中'}
                    variant="outlined"
                    sx={{
                      alignSelf: 'flex-start',
                      color: 'text.primary',
                      bgcolor: selectedRestaurant.openNow === true ? 'primary.light' : 'background.paper',
                      borderColor: 'divider',
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', alignItems: 'flex-start' }}>
                  <LocationOnIcon sx={{ fontSize: 20, mt: 0.4, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
                    {selectedRestaurant.address}
                  </Typography>
                </Stack>
                {/* 連結缺值時不建立按鈕；新分頁開啟以保留目前地圖與篩選。 */}
                {selectedRestaurant.uri && /^https:\/\//i.test(selectedRestaurant.uri) && (
                  <Button
                    component="a"
                    href={selectedRestaurant.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    aria-label={`在 Google Maps 開啟 ${selectedRestaurant.name}（新分頁）`}
                  >
                    在 Google Maps 開啟 ↗
                  </Button>
                )}
              </Stack>
            </InfoWindow>
          )}
        </Map>
      </Box>
    </Box>
  )
}
