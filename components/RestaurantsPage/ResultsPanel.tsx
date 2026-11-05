'use client'

// 結果面板：顯示篩選控制與餐廳清單，狀態由 MapContainer 統一管理。
import { DEFAULT_FILTERS, PRICE_LABELS, type RestaurantFilters } from '@/domain/places/filters'
import {
  Box,
  Button,
  MenuItem,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import type { Restaurant } from '@/domain/places/store'

type ResultsPanelProps = {
  onRandomSelect: () => void
  restaurants: Restaurant[] // 已套用條件的清單，也用來計算畫面筆數。
  selectedId?: string
  open: boolean // 由地圖容器管理開闔，面板只負責顯示。
  allRestaurants: Restaurant[] // 原始結果，用來建立完整類型選項與判斷空結果原因。
  filters: RestaurantFilters
  onFiltersChange: (filters: RestaurantFilters) => void
  onSelect: (restaurant: Restaurant) => void
}

type RestaurantListItemProps = {
  restaurant: Restaurant
  selected: boolean
  onSelect: (restaurant: Restaurant) => void
}

// 單筆餐廳保留原本點選回呼；未知價格與營業狀態不自行推測。
function RestaurantListItem({ restaurant, selected, onSelect }: RestaurantListItemProps) {
  const ratingLabel = restaurant.rating === null ? '尚無評分' : `評分 ${restaurant.rating} / 5`

  return (
    <ListItemButton
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
        secondary={`${ratingLabel} · ${restaurant.priceLevel ? PRICE_LABELS[restaurant.priceLevel] ?? '價格未知' : '價格未知'} · ${restaurant.openNow == null ? '營業狀態未知' : restaurant.openNow ? '營業中' : '休息中'} · ${restaurant.address}`}
        slotProps={{
          primary: { sx: { fontWeight: 700 } },
          secondary: { sx: { overflowWrap: 'anywhere' } },
        }}
      />
    </ListItemButton>
  )
}

// 下拉選單只篩選已取得的餐廳，不更改搜尋中心。
export default function ResultsPanel({
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
  // 以類型代碼去重；選項來自原始結果，避免篩選後可選類型跟著消失。
  const cuisines = [...new Map(allRestaurants.filter(r => r.cuisine).map(r => [r.cuisine!, r.cuisineLabel ?? r.cuisine!])).entries()]
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
        display: open ? 'block' : 'none',
        // 與地圖共用父層的高度變數，結果少時也保持等高。
        height: 'var(--panel-height)',
        minHeight: 0,
        border: '2px solid',
        borderColor: 'divider',
        borderRadius: '24px',
        overflow: 'hidden',
      }}
    >
      {/* 內容超出時只捲動面板內部，避免把外框和地圖一起撐高。 */}
      <Box sx={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', p: 1.5 }}>
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<ShuffleIcon />}
            onClick={onRandomSelect}
            disabled={allRestaurants.length === 0}
            fullWidth
          >
            隨機選一家
          </Button>
          <Typography variant="caption" color="text.secondary">
            從本次 {allRestaurants.length} 間餐廳中抽選，並重設篩選條件。
          </Typography>
          {/* 不使用浮動 label；displayEmpty 保留空值選項文字，aria-label 提供無障礙名稱。 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
            <TextField select size="small"
              slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '距離' } } }} value={filters.distance} onChange={e => updateFilter('distance', Number(e.target.value))}>
              {/* 選項以公尺保存、公里顯示，最大值不超過本次查詢半徑。 */}
              {[500, 1000, 2000, DEFAULT_FILTERS.distance].map(distance => <MenuItem key={distance} value={distance}>{distance / 1000} 公里內</MenuItem>)}
            </TextField>
            <TextField select size="small"
              slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '美食類型' } } }} value={filters.cuisine} onChange={e => updateFilter('cuisine', e.target.value)}>
              <MenuItem value="">全部類型</MenuItem>
              {cuisines.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select size="small"
              slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '價格' } } }} value={filters.price} onChange={e => updateFilter('price', e.target.value)}>
              <MenuItem value="">全部價格</MenuItem>
              {/* 僅從選單移除免費，不改寫 Google 回傳的餐廳價格資料。 */}
              {Object.entries(PRICE_LABELS).filter(([value]) => value !== 'FREE').map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              <MenuItem value="unknown">價格未知</MenuItem>
            </TextField>
            <TextField select size="small"
              slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '評分' } } }} value={filters.rating} onChange={e => updateFilter('rating', Number(e.target.value))}>
              <MenuItem value={0}>全部評分</MenuItem>
              {[3, 3.5, 4, 4.5].map(rating => <MenuItem key={rating} value={rating}>{rating} 分以上</MenuItem>)}
            </TextField>
            <TextField select size="small"
              slotProps={{ select: { displayEmpty: true, inputProps: { 'aria-label': '營業狀態' } } }} value={filters.opening} onChange={e => updateFilter('opening', e.target.value)}>
              <MenuItem value="">全部狀態</MenuItem>
              <MenuItem value="open">營業中</MenuItem>
              <MenuItem value="closed">休息中</MenuItem>
              <MenuItem value="unknown">狀態未知</MenuItem>
            </TextField>
            {/* 恢復所有餐廳篩選預設值，不重新查詢 API。 */}
            <Button variant="outlined" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}>重新選擇</Button>
          </Box>
          {/* 筆數使用篩選後陣列；aria-live 讓輔助工具得知結果更新。 */}
          <Typography component="h1" variant="h6" aria-live="polite">搜尋結果（{restaurants.length}）</Typography>
        </Stack>
          {/* 區分「沒有搜尋資料」與「有資料但不符合篩選」兩種情況。 */}
          {isEmpty && (
            <Typography sx={{ p: 1 }} color="text.secondary">
              {allRestaurants.length ? '沒有符合條件的餐廳，請調整篩選或重新選擇。' : '目前沒有餐廳資料，請查看搜尋狀態。'}
            </Typography>
          )}
          <List disablePadding aria-label="搜尋結果列表">
            {restaurants.map(restaurant => (
              <RestaurantListItem
                key={restaurant.id}
                restaurant={restaurant}
                selected={selectedId === restaurant.id}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Box>
    </Paper>
  )
}
