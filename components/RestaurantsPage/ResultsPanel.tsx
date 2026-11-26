'use client'

// 結果面板：顯示篩選控制與清單；篩選狀態在 RestaurantsPage，選取狀態在 MapContainer。
import { useEffect, useRef } from 'react'
import { DEFAULT_FILTERS, PRICE_LABELS, CUISINE_GROUPS, type RestaurantFilters } from '@/domain/places/filters'
import {
  Box,
  Button,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import CasinoIcon from '@mui/icons-material/Casino'
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash'
import type { Restaurant } from '@/domain/places/store'

type ResultsPanelProps = {
  isLoading: boolean // 載入時顯示 Skeleton，並暫停隨機抽選。
  listVisible?: boolean
  mobile?: boolean
  onRandomSelect: () => void
  restaurants: Restaurant[] // 已套用條件的清單，也用來計算畫面筆數。
  selectedId?: string
  open: boolean // 由地圖容器管理開闔，面板只負責顯示。
  allRestaurants: Restaurant[] // 本次查詢結果；供抽選、筆數與空結果訊息使用。
  filters: RestaurantFilters
  onFiltersChange: (filters: RestaurantFilters) => void
  onSelect: (restaurant: Restaurant) => void
}

type RestaurantListItemProps = {
  panelOpen: boolean
  restaurant: Restaurant
  selected: boolean
  onSelect: (restaurant: Restaurant) => void
}

// 固定顯示五張佔位卡片，尺寸與餐廳清單一致；載入完成後整批替換。
function RestaurantListSkeleton() {
  return Array.from({ length: 5 }, (_, index) => (
    <ListItem
      key={index}
      aria-hidden="true"
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        flexDirection: 'column',
        alignItems: 'stretch',
        py: 1.5,
        '@media (prefers-reduced-motion: reduce)': {
          '& .MuiSkeleton-root': { animation: 'none' },
        },
      }}
    >
      <Skeleton variant="text" width="65%" height={28} />
      <Skeleton variant="text" width="90%" height={20} />
      <Skeleton variant="text" width="75%" height={20} />
    </ListItem>
  ))
}

// 單筆餐廳保留原本點選回呼；未知價格與營業狀態不自行推測。
function RestaurantListItem({ restaurant, selected, panelOpen, onSelect }: RestaurantListItemProps) {
  const itemRef = useRef<HTMLDivElement>(null)

  // 等清單更新後再捲到選取項；收合時不捲動，重新展開時也會定位。
  useEffect(() => {
    if (!selected || !panelOpen) return
    const frame = requestAnimationFrame(() => {
      itemRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected, panelOpen])
  // 分開組合顯示文案，避免在 JSX 裡嵌套多層條件。
  // 下方組合摘要時會省略缺值欄位；資訊卡則另外顯示未知狀態。
  const priceLabel = restaurant.priceLevel
    ? PRICE_LABELS[restaurant.priceLevel] ?? '價格未知'
    : '價格未知'
  let openingLabel = '營業狀態未知'
  if (restaurant.openNow === true) openingLabel = '營業中'
  if (restaurant.openNow === false) openingLabel = '休息中'
  const ratingLabel = restaurant.rating === null ? '尚無評分' : `評分 ${restaurant.rating} / 5`

  return (
    <ListItemButton
      ref={itemRef}
      selected={selected}
      onClick={() => onSelect(restaurant)}
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        alignItems: 'flex-start',
        '&.Mui-selected': { bgcolor: 'primary.main' },
        '&.Mui-selected:hover': { bgcolor: 'primary.light' },
      }}
    >
      <ListItemText
        primary={restaurant.name}
        secondary={[
          restaurant.rating !== null && ratingLabel,
          restaurant.cuisineLabel,
          restaurant.priceLevel && priceLabel,
          restaurant.openNow != null && openingLabel,
          restaurant.address
        ].filter(Boolean).join(' · ')}
        slotProps={{
          primary: { sx: { fontWeight: 700 } },
          secondary: { sx: { overflowWrap: 'anywhere' } },
        }}
      />
    </ListItemButton>
  )
}

// 每個選單變更都通知父層重新查詢，並保留搜尋中心及其他條件。
export default function ResultsPanel({
  isLoading,
  mobile = false,
  listVisible = true,
  restaurants,
  selectedId,
  open,
  allRestaurants,
  filters,
  onFiltersChange,
  onSelect,
  onRandomSelect,
}: ResultsPanelProps) {
  const isEmpty = restaurants.length === 0
  // 載入中的空陣列不是空結果；保留按鈕外觀，以 aria-disabled 暫停操作。
  const randomUnavailable = isLoading || allRestaurants.length === 0
  const randomDisabled = !isLoading && allRestaurants.length === 0
  // 操作按鈕與篩選欄位同高、同圓角，避免沿用全站膠囊按鈕與位移效果。
  const filterActionStyles = {
    height: mobile ? 44 : 40,
    minHeight: mobile ? 44 : 40,
    px: 1.5,
    py: 0,
    fontSize: '1rem',
    borderRadius: 1,
    borderWidth: mobile ? 2 : undefined,
    boxShadow: 'none',
    '&:hover:not(.Mui-disabled), &:active:not(.Mui-disabled)': {
      transform: 'none',
      boxShadow: 'none',
    },
  }

  // aria-disabled 只提供語意，仍需在事件入口阻擋滑鼠與鍵盤觸發。
  function handleRandomSelect() {
    if (randomUnavailable) return
    onRandomSelect()
  }
  // 泛型確保欄位與值的型別一致；每次只更新一個條件，保留其餘選擇。
  function updateFilter<K extends keyof RestaurantFilters>(key: K, value: RestaurantFilters[K]) {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <Paper
      component="aside"
      id="restaurant-results"
      aria-label="搜尋結果面板"
      sx={{
        display: open ? 'flex' : 'none',
        flexDirection: 'column',
        // 與地圖共用父層的高度變數，結果少時也保持等高。
        height: mobile ? '100%' : 'var(--panel-height)',
        flex: mobile ? 1 : undefined,
        minHeight: 0,
        border: mobile ? 0 : '2px solid',
        borderColor: 'divider',
        borderRadius: mobile ? 0 : '24px',
        overflow: 'hidden',
      }}
    >
      {/* 控制區不參與捲動，隨機按鈕、篩選與結果筆數固定在上方。 */}
      <Stack spacing={1.5} sx={{ flexShrink: 0, p: 1.5 }}>
        <Button
          variant="contained"
          startIcon={<ShuffleIcon />}
          onClick={handleRandomSelect}
          aria-disabled={randomUnavailable}
          disableRipple={isLoading}
          // 只調整隨機按鈕：滑入時向下位移並縮短陰影，呈現按壓感。
          sx={{
            display: mobile ? 'none' : undefined,
            '@media (hover: hover)': {
              '&:hover:not(.Mui-disabled)': {
                transform: 'translateY(2px)',
                boxShadow: '1px 1px 0 var(--mui-palette-divider)',
              },
            },
            '&:active:not(.Mui-disabled)': {
              transform: 'translateY(3px)',
              boxShadow: 'none',
            },
            '@media (prefers-reduced-motion: reduce)': {
              '&&:hover, &&:active': { transform: 'none' },
            },
          }}
          disabled={randomDisabled}
          fullWidth
        >
          隨機選一家
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: mobile ? 'none' : undefined }}>
          從本次 {allRestaurants.length} 間符合條件的餐廳中抽選，保留目前篩選條件。
        </Typography>
        {/* 不使用浮動 label；displayEmpty 保留空值選項文字，aria-label 提供無障礙名稱。 */}
        <Box
          sx={{
            display: mobile ? 'flex' : 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.5,
            // 捲動容器會裁切溢出內容，四邊留白容納邊框與聚焦外框。
            py: mobile ? 1 : 0.5,
            px: mobile ? 1 : 0,
            // 手機控制項保持可點選寬度，放不下時橫向捲動。
            overflowX: mobile ? 'auto' : undefined,
            '& > *': mobile ? { flexShrink: 0, minWidth: 128 } : {},
            '& .MuiInputBase-root': mobile ? { minHeight: 44 } : {},
          }}
        >
          <TextField
            select
            size="small"
            slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '距離' } } }}
            value={filters.distance}
            onChange={e => updateFilter('distance', Number(e.target.value))}
          >
            {/* 選項以公尺保存、公里顯示；選定的值會成為新的 API 查詢半徑。 */}
            {[500, 1000, 2000, DEFAULT_FILTERS.distance].map(distance => (
              <MenuItem key={distance} value={distance}>
                {distance / 1000} 公里內
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '美食類型' } } }}
            value={filters.cuisine}
            onChange={e => updateFilter('cuisine', e.target.value)}
          >
            <MenuItem value="">全部類型</MenuItem>
            {CUISINE_GROUPS.map(({ value, label }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '價格' } } }}
            value={filters.price}
            onChange={e => updateFilter('price', e.target.value)}
          >
            <MenuItem value="">全部價格</MenuItem>
            {/* 僅從選單移除免費與 $$$$，不改寫 Google 回傳的餐廳價格資料。 */}
            {Object.entries(PRICE_LABELS)
              .filter(([value]) => value !== 'FREE' && value !== 'VERY_EXPENSIVE')
              .map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            <MenuItem value="unknown">價格未知</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '評分' } } }}
            value={filters.rating}
            onChange={e => updateFilter('rating', Number(e.target.value))}
          >
            <MenuItem value={0}>全部評分</MenuItem>
            {[3, 3.5, 4, 4.5].map(rating => (
              <MenuItem key={rating} value={rating}>
                {rating} 分以上
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '營業狀態' } } }}
            value={filters.opening}
            onChange={e => updateFilter('opening', e.target.value)}
          >
            <MenuItem value="">全部狀態</MenuItem>
            <MenuItem value="open">營業中</MenuItem>
            <MenuItem value="closed">休息中</MenuItem>
            <MenuItem value="unknown">狀態未知</MenuItem>
          </TextField>
          {/* 恢復預設條件；任何查詢條件改變都會重新查詢 API。 */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}
            aria-label="重新選擇"
            // 與 small 下拉選單同高，寬度沿用相同的 Grid 欄位。
            sx={filterActionStyles}
          >
            {/* 手機以圖示節省寬度，aria-label 保留完整操作名稱。 */}
            {mobile ? <RestoreFromTrashIcon /> : '重新選擇'}
          </Button>
          {mobile && (
            <Button
              variant="outlined"
              size="small"
              aria-label="隨機選一家"
              onClick={handleRandomSelect}
              aria-disabled={randomUnavailable}
              disableRipple={isLoading}
              disabled={randomDisabled}
              sx={filterActionStyles}
            >
              <CasinoIcon />
            </Button>
          )}
        </Box>
        {/* 筆數使用篩選後陣列；aria-live 讓輔助工具得知結果更新。 */}
        <Typography
          component="h1"
          variant="h6"
          aria-live="polite"
          sx={{ display: mobile ? 'none' : undefined }}
        >
          {isLoading ? '搜尋中...' : `搜尋結果（${restaurants.length}）`}
        </Typography>
      </Stack>
      {/* 只讓餐廳結果佔用剩餘高度並捲動；minHeight: 0 避免清單撐開面板。 */}
      <Box
        role="region"
        aria-label="可捲動的餐廳結果"
        aria-busy={isLoading}
        tabIndex={0}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', px: 1.5, pb: 1.5 }}
      >
        {/* 區分「沒有搜尋資料」與「有資料但不符合篩選」兩種情況。 */}
        {!isLoading && isEmpty && (
          <Typography sx={{ p: 1 }} color="text.secondary">
            {allRestaurants.length ? '沒有符合條件的餐廳，請調整篩選或重新選擇。' : '目前沒有餐廳資料，請查看搜尋狀態。'}
          </Typography>
        )}
        <List disablePadding aria-label="搜尋結果列表">
          {isLoading ? <RestaurantListSkeleton /> : restaurants.map(restaurant => (
            <RestaurantListItem
              key={restaurant.id}
              restaurant={restaurant}
              selected={selectedId === restaurant.id}
              panelOpen={open && listVisible}
              onSelect={onSelect}
            />
          ))}
        </List>
      </Box>
    </Paper>
  )
}
