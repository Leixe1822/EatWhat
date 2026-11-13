// 本地篩選工具：只處理本次取得的餐廳，不呼叫 Google，也不改變搜尋中心。
import type { Center } from '@/domain/map/location'
import type { Restaurant } from '@/domain/places/store'
import { SEARCH_RADIUS } from '@/domain/places/nearby'

// 空字串代表不限條件；距離以公尺保存，評分 0 代表不限最低評分。
export type RestaurantFilters = {
  keyword: string // 保留本地文字篩選能力；目前結果頁沒有關鍵字輸入框。
  distance: number
  cuisine: string // 儲存分組 value（例如 japanese），不是 Google 的原始類型。
  price: string
  rating: number
  opening: string
}
// 初始載入與「重新選擇」共用預設值，距離跟實際查詢半徑保持一致。
export const DEFAULT_FILTERS: RestaurantFilters = {
  keyword: '', distance: SEARCH_RADIUS, cuisine: '', price: '', rating: 0, opening: '',
}
// Google 價格代碼對應顯示文字；保留 FREE 供餐廳資料顯示，選單另行排除。
export const PRICE_LABELS: Record<string, string> = {
  FREE: '免費', INEXPENSIVE: '$', MODERATE: '$$', EXPENSIVE: '$$$', VERY_EXPENSIVE: '$$$$',
}
// 固定分組使用 Google 主要類型代碼；每間店只歸入一組，未涵蓋的類型歸入其他。
export const CUISINE_GROUPS = [
  // 僅依明確的台式分類，不把所有 snack_bar 或一般餐廳推測成台式小吃。
  { value: 'taiwanese', label: '台式料理', types: ['taiwanese_restaurant'] },
  { value: 'chinese', label: '中式料理', types: ['chinese_restaurant', 'chinese_noodle_restaurant', 'dim_sum_restaurant', 'dumpling_restaurant', 'cantonese_restaurant'] },
  { value: 'japanese', label: '日式料理', types: ['japanese_restaurant', 'ramen_restaurant', 'japanese_curry_restaurant', 'japanese_izakaya_restaurant', 'sushi_restaurant', 'tonkatsu_restaurant'] },
  { value: 'korean', label: '韓式料理', types: ['korean_restaurant', 'korean_barbecue_restaurant'] },
  { value: 'american', label: '美式料理', types: ['american_restaurant', 'hamburger_restaurant'] },
  { value: 'italian', label: '義式料理', types: ['italian_restaurant', 'pizza_restaurant'] },
  { value: 'southeast_asian', label: '東南亞料理', types: ['thai_restaurant', 'vietnamese_restaurant', 'indonesian_restaurant', 'malaysian_restaurant', 'filipino_restaurant', 'cambodian_restaurant', 'burmese_restaurant'] },
  { value: 'hot_pot', label: '火鍋', types: ['hot_pot_restaurant'] },
  { value: 'barbecue', label: '燒烤', types: ['barbecue_restaurant', 'mongolian_barbecue_restaurant', 'yakiniku_restaurant', 'yakitori_restaurant'] },
  { value: 'breakfast', label: '早餐／早午餐', types: ['breakfast_restaurant', 'brunch_restaurant'] },
  { value: 'vegetarian', label: '素食／蔬食', types: ['vegetarian_restaurant', 'vegan_restaurant'] },
  { value: 'cafe', label: '咖啡／甜點', types: ['cafe', 'coffee_shop', 'cat_cafe', 'dog_cafe', 'bakery', 'dessert_shop', 'dessert_restaurant', 'ice_cream_shop', 'cake_shop', 'donut_shop', 'pastry_shop'] },
  { value: 'other', label: '其他', types: [] },
]

// 找不到類型或資料缺漏時，統一歸入「其他」，避免遺漏餐廳。
export function getCuisineGroup(cuisine: string | null | undefined): string {
  return CUISINE_GROUPS.find(group => group.types.includes(cuisine ?? ''))?.value ?? 'other'
}

// 以本次完整結果計數，不隨其他篩選改變，也不代表附近所有餐廳的數量。
export function getCuisineOptions(restaurants: Restaurant[]) {
  return CUISINE_GROUPS.map(group => ({
    ...group,
    count: restaurants.filter(restaurant => getCuisineGroup(restaurant.cuisine) === group.value).length,
  }))
}

// 使用 Haversine 公式計算兩點的球面直線距離，不是道路或步行距離。
export function distanceMeters(a: Center, b: Center): number {
  const radians = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * radians / 2) ** 2
    + Math.cos(a.lat * radians) * Math.cos(b.lat * radians)
    * Math.sin((b.lng - a.lng) * radians / 2) ** 2
  // 地球平均半徑約 6,371 公里；限制 h 上界，避免浮點誤差造成 NaN。
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}
// 所有條件以 AND 組合；filter 回傳新陣列，不修改原始搜尋結果。
export function filterRestaurants(restaurants: Restaurant[], center: Center, filters: RestaurantFilters) {
  // 忽略頭尾空白及大小寫，讓名稱與地址使用相同的比對規則。
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  return restaurants.filter(restaurant => {
    return (!keyword || `${restaurant.name}\n${restaurant.address}`.toLocaleLowerCase().includes(keyword))
      && distanceMeters(center, restaurant.location) <= filters.distance
      && (!filters.cuisine || getCuisineGroup(restaurant.cuisine) === filters.cuisine)
      // unknown 只比對缺值；沒有價格不代表免費。
      && (!filters.price || (filters.price === 'unknown'
        ? !restaurant.priceLevel : restaurant.priceLevel === filters.price))
      && (!filters.rating || (restaurant.rating !== null && restaurant.rating >= filters.rating))
      // null／undefined 表示未知；false 才是已知休息中。
      && (!filters.opening || (filters.opening === 'unknown'
        ? restaurant.openNow == null : restaurant.openNow === (filters.opening === 'open')))
  })
}
