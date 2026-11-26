'use client'

// 餐廳地圖：共用一份餐廳資料來產生標記、清單與資訊視窗。
import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Switch,
  Stack,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material'
import { AdvancedMarker, InfoWindow, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import CloseIcon from '@mui/icons-material/Close'
import ListAltIcon from '@mui/icons-material/ListAlt'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import { filterRestaurants, type RestaurantFilters } from '@/domain/places/filters'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MobileSheet, {
  COLLAPSED_HEIGHT,
  HALF_OPEN_HEIGHT,
} from '@/components/RestaurantsPage/MobileSheet'
import MobileSearch from '@/components/RestaurantsPage/MobileSearch'
import ResultsPanel from '@/components/RestaurantsPage/ResultsPanel'
import useMapStore, { setMap } from '@/domain/map/store'
import { isValidCenter, type Center } from '@/domain/map/location'
import type { Restaurant } from '@/domain/places/store'
import { MAP_ID } from './config'
import useMobileViewport from './useMobileViewport'

// Google Circle 不是 React 元件；effect 建立它，cleanup 負責從地圖移除。
function SearchRange({ center, radius, isMobile, focusSearch }: {
  center: Center
  radius: number
  isMobile: boolean
  focusSearch: boolean
}) {
  const map = useMap()
  const maps = useMapsLibrary('maps')
  const theme = useTheme()
  const { lat, lng } = center
  // 將套件內部的地圖實例提供給外層互動事件，卸載時清掉參考。
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
    return () => circle.setMap(null)
  }, [map, maps, lat, lng, radius, theme.palette.primary.main, theme.palette.secondary.main])

  useEffect(() => {
    if (!map || !maps || !focusSearch) return

    // 0.5、1、2 公里再拉近視角，3 公里維持原設定；不改變實際搜尋範圍。
    const cameraRadius = radius * (radius <= 2000 ? 0.6 : 0.75)
    const bounds = new maps.Circle({ center: { lat, lng }, radius: cameraRadius }).getBounds()
    if (!bounds) return
    const mapElement = map.getDiv()
    let resizeTimer: ReturnType<typeof setTimeout> | undefined

    const fitSearchRange = () => {
      if (!mapElement.clientWidth || !mapElement.clientHeight) return
      const topPadding = isMobile
        ? Math.min(112, mapElement.clientHeight / 3)
        : 32
      map.fitBounds(bounds, { top: topPadding, bottom: 32, left: 32, right: 32 })
    }

    fitSearchRange()
    // 等面板過場或鍵盤尺寸穩定後再縮放，避免每個動畫影格都移動鏡頭。
    // 只監聽容器尺寸；使用者手動平移或縮放不會觸發這個 observer。
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(fitSearchRange, 150)
    })
    observer.observe(mapElement)

    return () => {
      observer.disconnect()
      clearTimeout(resizeTimer)
    }
  }, [map, maps, lat, lng, radius, isMobile, focusSearch])
  return null
}

// 頁面負責查詢條件與中心；容器只管理視角、餐廳選取和面板開關。
type MapContainerProps = {
  isLoading: boolean
  filters: RestaurantFilters
  onFiltersChange: (filters: RestaurantFilters) => void
  center: Center
  restaurants: Restaurant[]
  onCenterChange: (center: Center) => void
}
type RestaurantSelection = {
  id: string
  results: Restaurant[] // 記住選取時的資料批次；新搜尋不沿用舊選取。
}

export default function MapContainer({
  isLoading,
  center,
  restaurants,
  onCenterChange,
  filters,
  onFiltersChange,
}: MapContainerProps) {
  // 篩選狀態由查詢層管理；同一份篩選結果同時驅動清單、筆數與標記。
  const filteredRestaurants = filterRestaurants(restaurants, center, filters)
  const [selection, setSelection] = useState<RestaurantSelection | null>(null)
  // 桌面保留側欄開關；手機另以三段式面板高度管理。
  const [listOpen, setListOpen] = useState<boolean | null>(null)
  const map = useMapStore(state => state.map)
  const isMobile = useMediaQuery('(max-width: 767.98px)')
  const isDesktop = !isMobile
  const [sheetHeight, setSheetHeight] = useState(HALF_OPEN_HEIGHT)
  // 拖曳期間將共用過場時間設為零，避免面板落後手指移動。
  const [isSheetDragging, setIsSheetDragging] = useState(false)
  const containerRef = useMobileViewport(isMobile)
  const isSheetListVisible = sheetHeight > COLLAPSED_HEIGHT
  // 關閉詳細資料後，回到選取前的清單高度。
  const previousListHeight = useRef(HALF_OPEN_HEIGHT)
  const detailCardRef = useRef<HTMLDivElement>(null)
  const detailHeaderRef = useRef<HTMLDivElement>(null)
  const detailBodyRef = useRef<HTMLDivElement>(null)
  const [detailHeight, setDetailHeight] = useState(320)
  // 尚未手動切換時依螢幕大小決定；切換後保留使用者的選擇。
  const panelOpen = listOpen ?? isDesktop

  // 新搜尋使用新的結果陣列，舊選取項目立即失效。
  let selectedRestaurant: Restaurant | undefined
  if (selection && selection.results === restaurants) {
    // 被篩選排除的餐廳不顯示資訊視窗，但不修改原始資料批次。
    selectedRestaurant = filteredRestaurants.find(restaurant => restaurant.id === selection.id)
  }

  // 半開的詳細面板依實際內容決定高度；手動拖曳仍保留原本的三段操作。
  // 量測自然內容高度，不以面板高度反推，避免尺寸互相影響而持續增長。
  useEffect(() => {
    const card = detailCardRef.current
    const header = detailHeaderRef.current
    const body = detailBodyRef.current
    if (!isMobile || !selectedRestaurant || !card || !header || !body) return

    const observer = new ResizeObserver(() => {
      const styles = getComputedStyle(card)
      const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
      const gap = parseFloat(getComputedStyle(body).marginTop) || 0
      // 44px 是面板把手，2px 是上邊框；安全區域由 CSS 另外加上。
      const contentHeight = padding + gap + header.offsetHeight + body.scrollHeight
      const handleAndBorderHeight = 44 + 2
      setDetailHeight(Math.ceil(handleAndBorderHeight + contentHeight))
    })
    observer.observe(card)
    observer.observe(header)
    observer.observe(body)
    return () => observer.disconnect()
  }, [isMobile, selectedRestaurant])

  // 清單和標記都呼叫這個函式，確保資訊視窗與地圖位置同步。
  function selectRestaurant(restaurant: Restaurant) {
    if (isMobile && !selectedRestaurant) previousListHeight.current = sheetHeight
    setSelection({ id: restaurant.id, results: restaurants })
    map?.panTo(restaurant.location)
    if (!isDesktop) {
      // 詳細資料直接取代底部清單，上半部保留地圖。
      setSheetHeight(HALF_OPEN_HEIGHT)
    }
  }

  function closeRestaurantDetails() {
    setSelection(null)
    if (isMobile) setSheetHeight(previousListHeight.current)
  }

  // 面板高度穩定後，將標記置於搜尋列下方的可見地圖中央。
  useEffect(() => {
    if (!isMobile || !map || !selectedRestaurant) return
    const mapElement = map.getDiv()
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const centerSelectedMarker = () => {
      const height = mapElement.clientHeight
      if (!height) return
      map.panTo(selectedRestaurant.location)
      map.panBy(0, -Math.min(56, height / 4))
    }
    const frame = requestAnimationFrame(centerSelectedMarker)
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(centerSelectedMarker, 150)
    })
    observer.observe(mapElement)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(resizeTimer)
      observer.disconnect()
    }
  }, [isMobile, map, selectedRestaurant])

  // 手機地址搜尋或定位成功後，更新搜尋中心並收合面板。
  function locateCenter(next: Center) {
    setSelection(null)
    onCenterChange(next)
    map?.panTo(next)
    setSheetHeight(COLLAPSED_HEIGHT)
  }

  // 從本次完整結果等機率抽一間，不額外呼叫 API。
  // 保留全部搜尋條件，從本次符合條件的結果抽選，不觸發新搜尋。
  function selectRandomRestaurant() {
    if (isLoading || restaurants.length === 0) return
    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)]
    selectRestaurant(restaurant)
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

  // 手機與桌面共用結果內容，只有手機需要底部面板包覆。
  const resultsPanel = (
    <ResultsPanel
      isLoading={isLoading}
      mobile={isMobile}
      listVisible={!isMobile || isSheetListVisible}
      restaurants={filteredRestaurants}
      allRestaurants={restaurants}
      filters={filters}
      onFiltersChange={onFiltersChange}
      selectedId={selectedRestaurant?.id}
      open={isMobile || panelOpen}
      onSelect={restaurant => selectRestaurant(restaurant)}
      onRandomSelect={selectRandomRestaurant}
    />
  )

  // 桌面使用地圖資訊視窗；手機將同一份內容放進底部面板。
  const restaurantCard = selectedRestaurant && (
    <Stack
      ref={detailCardRef}
      spacing={2}
      sx={{
        p: 2,
        // 手機內容統一內縮，標題、地址與按鈕都避開面板外框。
        px: isMobile ? '24px' : 2,
        // 手機按鈕下方保留 64px，量測面板高度時也會納入這段留白。
        pb: isMobile ? '64px' : 2,
        m: isMobile ? 0 : 0.5,
        mb: isMobile ? 0 : 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        border: isMobile ? 0 : '2px solid',
        borderColor: 'divider',
        borderRadius: isMobile ? 0 : '20px',
        boxShadow: isMobile ? 'none' : '3px 3px 0 var(--mui-palette-divider)',
        flex: isMobile ? 1 : undefined,
        // 手機卡片由外層可見區域限制高度，只有詳細資料可捲動。
        maxWidth: isMobile ? undefined : 272,
        maxHeight: isMobile ? '100%' : undefined,
        minHeight: 0,
        boxSizing: 'border-box',
        overflow: isMobile ? 'hidden' : undefined,
        overflowWrap: 'anywhere',
      }}
    >
      <Stack ref={detailHeaderRef} direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexShrink: 0 }}>
        <Typography
          component="h2"
          variant="h6"
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 800,
            lineHeight: 1.4,
            // 長店名可獨立捲動，保留右側關閉按鈕的可操作空間。
            maxHeight: isMobile ? 80 : undefined,
            overflowY: isMobile ? 'auto' : undefined,
          }}
        >
          {selectedRestaurant.name}
        </Typography>
        <IconButton
          size="small"
          aria-label="關閉餐廳資訊"
          onClick={closeRestaurantDetails}
          sx={{ color: 'text.primary', minWidth: 44, minHeight: 44 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      {/* 地址與連結自然接續排列；小螢幕可一起捲動，底部留白避免按鈕貼邊。 */}
      <Stack
        ref={detailBodyRef}
        spacing={2}
        sx={{
          minHeight: 0,
          // 捲動容器會裁切子元素陰影與焦點框，需在容器內預留 8px。
          // 同時向左右延伸容器，維持內容原本的 24px 對齊位置。
          p: isMobile ? '8px' : 0,
          width: isMobile ? 'calc(100% + 16px)' : undefined,
          alignSelf: isMobile ? 'center' : undefined,
          boxSizing: 'border-box',
          overflowY: isMobile ? 'auto' : undefined,
          overscrollBehavior: 'contain',
          '& > *': { flexShrink: 0 },
        }}
      >
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
        <Stack
          direction="row"
          spacing={1}
          sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', alignItems: 'flex-start' }}
        >
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
            sx={{
              flexShrink: 0,
              minHeight: 44,
            }}
            aria-label={`在 Google Maps 開啟 ${selectedRestaurant.name}（新分頁）`}
          >
            在 Google Maps 開啟 ↗
          </Button>
        )}
      </Stack>
    </Stack>
  )

  return (
    <Box
      ref={containerRef}
      sx={{
        // 面板、地圖與定位按鈕同步過場；拖曳時立即跟隨手指。
        '--mobile-motion-duration': theme => isSheetDragging
          ? '0ms'
          : `${theme.transitions.duration.short}ms`,
        '@media (prefers-reduced-motion: reduce)': {
          '--mobile-motion-duration': '0ms',
        },
        position: isMobile ? 'fixed' : 'relative',
        inset: isMobile ? 'var(--mobile-top, 0px) 0 auto' : undefined,
        height: isMobile ? 'var(--mobile-height, 100dvh)' : undefined,
        overflow: isMobile ? 'hidden' : undefined,
        '--sheet-size': isMobile && selectedRestaurant && sheetHeight === HALF_OPEN_HEIGHT && !isSheetDragging
          ? `min(calc(${detailHeight}px + env(safe-area-inset-bottom)), calc(100% - 120px - env(safe-area-inset-top)))`
          : `clamp(calc(88px + env(safe-area-inset-bottom)), ${sheetHeight}%, calc(100% - 120px - env(safe-area-inset-top)))`,
        display: isMobile ? 'block' : 'grid',
        flex: 1,
        minHeight: { xs: 0, md: 360 },
        gridTemplateRows: { md: 'minmax(0, 1fr)' },
        // 桌面兩欄同高；手機使用獨立的面板高度變數。
        '--panel-height': '100%',
        // 收合時只保留地圖一欄，按鈕以絕對定位疊在地圖內。
        gridTemplateColumns: panelOpen ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)',
        gap: 2,
        alignItems: 'stretch',
      }}
    >
      {isMobile && <MobileSearch onLocated={locateCenter} />}
      {isMobile ? (
        <MobileSheet
          isLoading={isLoading}
          height={sheetHeight}
          onHeightChange={setSheetHeight}
          onDraggingChange={setIsSheetDragging}
          count={filteredRestaurants.length}
          detailTitle={selectedRestaurant?.name}
        >
          {selectedRestaurant ? restaurantCard : resultsPanel}
        </MobileSheet>
      ) : (
        resultsPanel
      )}
      <Box
        sx={{
          position: 'relative',
          // 移除 Google 資訊視窗的外層白底、陰影與箭頭，只顯示自訂卡片。
          // gm-style-* 屬於 Google 產生的樣式名稱，套件更新後須確認外觀仍正常。
          '& .gm-style-iw-c': { background: 'transparent', boxShadow: 'none', padding: '0 !important' },
          '& .gm-style-iw-d': { overflow: 'auto !important' },
          '& .gm-style-iw-tc': { display: 'none' },
          minWidth: 0,
          height: isMobile ? 'calc(100% - var(--sheet-size))' : 'var(--panel-height)',
          transition: theme => isMobile
            ? theme.transitions.create('height', {
              duration: 'var(--mobile-motion-duration)',
              easing: theme.transitions.easing.easeInOut,
            })
            : 'none',
          minHeight: 0,
          border: isMobile ? 0 : '2px solid',
          borderColor: 'divider',
          borderRadius: isMobile ? 0 : '24px',
          overflow: 'hidden',
        }}
      >
        {/* 固定在地圖左上角，收合清單後仍可操作開關。 */}
        <FormControlLabel
          label={<ListAltIcon sx={{ display: 'block' }} />}
          labelPlacement="start"
          disableTypography
          control={
            <Switch
              checked={panelOpen}
              onChange={(_event, checked) => setListOpen(checked)}
              slotProps={{ input: { 'aria-label': '顯示搜尋結果', 'aria-controls': 'restaurant-results' } }}
            />
          }
          sx={{
            display: isMobile ? 'none' : 'flex',
            position: 'absolute',
            zIndex: 1,
            left: 12,
            top: 12,
            m: 0,
            pl: 1.5,
            minHeight: 44,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 3,
          }}
        />
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={12}
          disableDefaultUI
          zoomControl={!isMobile}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          gestureHandling={isMobile ? "greedy" : "cooperative"}
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
          {/* 範圍圈跟隨距離選單；半徑同時用於附近搜尋。 */}
          <SearchRange
            center={center}
            radius={filters.distance}
            isMobile={isMobile}
            focusSearch={!selectedRestaurant}
          />
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
                  // 選取餐廳以深橘色區分，米白描邊呼應頁面底色。
                  color: selectedRestaurant?.id === restaurant.id ? '#C65D32' : 'secondary.main',
                  stroke: selectedRestaurant?.id === restaurant.id
                    ? 'var(--mui-palette-background-default)'
                    : 'var(--mui-palette-background-paper)',
                  strokeWidth: 0.7,
                  display: 'block',
                }}
              />
            </AdvancedMarker>
          ))}
          {/* 只有選中餐廳時才建立 InfoWindow；關閉只清空 selection。 */}
          {selectedRestaurant && !isMobile && (
            <InfoWindow
              key={selectedRestaurant.id}
              position={selectedRestaurant.location}
              pixelOffset={[0, -40]}
              maxWidth={320}
              ariaLabel={selectedRestaurant.name}
              headerDisabled
              onClose={() => setSelection(null)}
            >
              {restaurantCard}
            </InfoWindow>
          )}
        </Map>
      </Box>
    </Box>
  )
}
