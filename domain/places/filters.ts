// 本地篩選工具：只處理本次取得的餐廳，不呼叫 Google，也不改變搜尋中心。
import type { Center } from '@/domain/map/location'
import type { Restaurant } from '@/domain/places/store'
import { getCuisineGroup } from '@/domain/places/cuisines'
export { CUISINE_GROUPS, getCuisineGroup, getCuisineOptions } from '@/domain/places/cuisines'
import { SEARCH_RADIUS } from '@/domain/places/searchConfig'

// 空字串代表不限條件；距離以公尺保存，評分 0 代表不限最低評分。
export type RestaurantFilters = {
  keyword: string // 保留本地文字篩選能力；目前結果頁沒有關鍵字輸入框。
  distance: number // 公尺；同時用於 API 查詢半徑及本地距離檢查。
  cuisine: string // 儲存分組 value（例如 japanese），不是 Google 的原始類型。
  price: string // 空字串不限；unknown 表示缺少價格資料。
  rating: number // 最低評分，0 表示不限制。
  opening: string // 空字串不限；open、closed、unknown 對應三種狀態。
}
// 初始載入與「重新選擇」共用預設值，距離跟實際查詢半徑保持一致。
export const DEFAULT_FILTERS: RestaurantFilters = {
  keyword: '',
  distance: SEARCH_RADIUS,
  cuisine: '',
  price: '',
  rating: 0,
  opening: '',
}
// Google 價格代碼對應顯示文字；保留 FREE 供餐廳資料顯示，選單另行排除。
export const PRICE_LABELS: Record<string, string> = {
  FREE: '免費',
  INEXPENSIVE: '$',
  MODERATE: '$$',
  EXPENSIVE: '$$$',
  VERY_EXPENSIVE: '$$$$',
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
