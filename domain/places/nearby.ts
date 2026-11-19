// 負責向 Google 取得附近餐廳；這個檔案不直接控制 React 畫面。
import { getOpenNow } from '@/domain/places/openingHours'
import type { Restaurant } from './store'
import { isValidCenter, type Center } from '@/domain/map/location'
import { CUISINE_GROUPS } from '@/domain/places/cuisines'

import { SEARCH_RADIUS } from '@/domain/places/searchConfig'
import { DEFAULT_FILTERS, filterRestaurants, type RestaurantFilters } from '@/domain/places/filters'
export { SEARCH_RADIUS } from '@/domain/places/searchConfig'
export const MAX_RESULTS = 20 // 單次最多 20 筆，不代表範圍內的全部餐廳。
const CACHE_DURATION = 60000 // 同一中心點的結果保留 60 秒。
const SEARCH_TIMEOUT = 20000 // 最多等待 20 秒。
const MAX_CACHE_ENTRIES = 20
// 先依 Google 分類排除婚宴與住宿場所。
const EXCLUDED_PLACE_TYPES = new Set(['wedding_venue', 'banquet_hall', 'hotel', 'lodging'])
// 有些婚宴場所只被標成 restaurant；用明確的婚宴名稱／類型文字補判。
// 不以「飯店」「會館」「宴」等單一泛稱排除，避免誤刪一般餐館。
const WEDDING_VENUE_PATTERN = /婚宴|婚礼|婚禮|宴會廳|宴会厅|宴會館|宴会馆|\bwedding\b|\bbanquet\s+(?:hall|venue|center|centre)\b/i

// 保存進行中的 Promise 也能合併重複呼叫；expires 以送出時間起算。
type CachedSearch = {
  promise: Promise<Restaurant[]>
  expires: number
}

// Map 是 JavaScript 的鍵值表，不是 Google 地圖。
// 非強制更新時，同座標、同搜尋條件的呼叫共用 Promise；refresh=true 會略過快取。
const cache = new Map<string, CachedSearch>()

// 將 Google Place 轉為畫面共用資料；排除無效座標與重複 ID，保留缺值。
async function convertPlacesToRestaurants(places: google.maps.places.Place[]): Promise<Restaurant[]> {
  const restaurants: Restaurant[] = []
  const seenIds = new Set<string>() // Set 用來記錄已加入的餐廳 ID，避免重複。

  for (const place of places) {
    if (!place.location || seenIds.has(place.id)) {
      continue
    }

    // 同時檢查主要及其他類型，避免兼具 restaurant 分類的飯店混入。
    if (EXCLUDED_PLACE_TYPES.has(place.primaryType ?? '')
      || place.types?.some(type => EXCLUDED_PLACE_TYPES.has(type))
      || WEDDING_VENUE_PATTERN.test(place.displayName ?? '')
      || WEDDING_VENUE_PATTERN.test(place.primaryTypeDisplayName ?? '')) {
      continue
    }

    const location = place.location.toJSON()
    if (!isValidCenter(location)) {
      continue
    }

    seenIds.add(place.id)
    // 依本次實際營業時間及店家時區判斷，不依賴 beta 版 isOpen()。
    const openNow = getOpenNow(place.currentOpeningHours, place.utcOffsetMinutes)
    restaurants.push({
      id: place.id,
      name: place.displayName ?? '未提供名稱',
      address: place.formattedAddress ?? '未提供地址',
      location,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      cuisine: place.primaryType ?? null,
      cuisineLabel: place.primaryTypeDisplayName ?? null,
      priceLevel: place.priceLevel ?? null,
      openNow,
      uri: place.googleMapsURI ?? null,
    })
  }
  return restaurants
}

// 快取以中心及全部搜尋條件區分；結果頁每次變更條件都要求重新查詢。
export function fetchNearby(
  library: google.maps.PlacesLibrary,
  center: Center,
  radius = SEARCH_RADIUS,
  refresh = false,
  cuisine = '',
  criteria: Pick<RestaurantFilters, 'price' | 'rating' | 'opening'> = DEFAULT_FILTERS,
): Promise<Restaurant[]> {
  if (!isValidCenter(center)) {
    return Promise.reject(new Error('無效中心點'))
  }

  if (![500, 1000, 2000, 3000].includes(radius)) {
    return Promise.reject(new Error('無效搜尋半徑'))
  }
  const cuisineGroup = CUISINE_GROUPS.find(group => group.value === cuisine)
  if (cuisine && !cuisineGroup) {
    return Promise.reject(new Error('無效料理類別'))
  }
  // 先補齊預設條件，主查詢與補查都以同一份條件決定保留哪些餐廳。
  const filters = { ...DEFAULT_FILTERS, ...criteria, distance: radius, cuisine }
  const cacheKey = JSON.stringify([center.lat, center.lng, radius, cuisine, filters.price, filters.rating, filters.opening])
  const cachedSearch = cache.get(cacheKey)
  if (!refresh && cachedSearch && cachedSearch.expires > Date.now()) {
    return cachedSearch.promise
  }

  // 首輪已拿滿但排除後不足時，最多三次按料理類型補查。
  const generalSupplementalTypes = [
    [
      'taiwanese_restaurant',
      'chinese_restaurant',
      'japanese_restaurant',
      'ramen_restaurant',
      'sushi_restaurant'
    ],
    [
      'korean_restaurant',
      'american_restaurant',
      'italian_restaurant',
      'pizza_restaurant',
      'thai_restaurant',
      'vietnamese_restaurant'
    ],
    [
      'hot_pot_restaurant',
      'barbecue_restaurant',
      'breakfast_restaurant',
      'brunch_restaurant',
      'vegetarian_restaurant',
      'vegan_restaurant'
    ],
  ]
  // 指定類別時只能補查該類別的子類型，避免混入其他料理。
  const selectedTypes = cuisineGroup?.types ?? []
  // 將子類型最多分成三批；單一子類型無須重送相同查詢。
  const batchSize = Math.max(1, Math.ceil(selectedTypes.length / 3))
  const supplementalTypes = cuisine
    ? (selectedTypes.length > 1
      ? Array.from({ length: Math.ceil(selectedTypes.length / batchSize) }, (_, index) =>
        selectedTypes.slice(index * batchSize, (index + 1) * batchSize))
      : [])
    : generalSupplementalTypes

  async function convertMatchingPlaces(places: google.maps.places.Place[]) {
    const restaurants = await convertPlacesToRestaurants(places)
    // Nearby API 不支援價格、評分、營業狀態參數，每輪新資料都先套用條件再補查。
    return filterRestaurants(restaurants, center, filters)
  }
  // 保留已完成的部分；整批逾時時可先顯示，避免補查拖累首輪結果。
  let partialResults: Restaurant[] = []
  let expired = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  // 保留下一個微任務才送出請求的時序：先登記快取，再呼叫 Google。
  // 這也會把同步拋出的錯誤轉成 Promise 的失敗結果，交給下方 catch 處理。
  const googleRequest = Promise.resolve().then(async () => {
    const request: google.maps.places.SearchNearbyRequest = {
      // 一次取得顯示與篩選所需欄位；營業時間和時區供營業狀態判斷使用。
      fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'userRatingCount', 'googleMapsURI',
        'primaryType', 'types', 'primaryTypeDisplayName', 'priceLevel', 'currentOpeningHours', 'utcOffsetMinutes'],
      locationRestriction: { center, radius },
      // 咖啡／甜點等分組不必兼具 restaurant 次要類型。
      ...(selectedTypes.length
        ? { includedPrimaryTypes: selectedTypes }
        : { includedTypes: ['restaurant'] }),
      // 「其他」是未歸入已知分組的餐廳，沒有對應的 Google 類型代碼。
      ...(cuisine === 'other'
        ? { excludedPrimaryTypes: CUISINE_GROUPS.flatMap(group => group.types) }
        : {}),
      excludedTypes: [...EXCLUDED_PLACE_TYPES],
      maxResultCount: MAX_RESULTS,
    }
    const response = await library.Place.searchNearby(request)
    const results = await convertMatchingPlaces(response.places)
    partialResults = results
    const seen = new Set(results.map(restaurant => restaurant.id))
    // 首輪不足 20 筆就停止補查，以限制請求量；這不保證已找到範圍內所有餐廳。
    if (response.places.length < MAX_RESULTS) return results
    // 逐批補查，保留首輪順序，僅追加新的 ID；滿額或逾時立即停止。
    for (const includedPrimaryTypes of supplementalTypes) {
      if (expired || results.length >= MAX_RESULTS) break
      try {
        const extra = await library.Place.searchNearby({ ...request, includedPrimaryTypes })
        if (expired) break
        for (const restaurant of await convertMatchingPlaces(extra.places)) {
          if (!seen.has(restaurant.id)) {
            seen.add(restaurant.id)
            results.push(restaurant)
          }
          if (results.length >= MAX_RESULTS) break
        }
      } catch {
        // 補查失敗仍保留首輪結果，不因額外查詢讓整頁變成錯誤。
        break
      }
    }
    return results
  })
  // 整批查詢共用逾時；補查逾時仍可回傳已取得的餐廳。
  const timeout = new Promise<Restaurant[]>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      expired = true
      if (partialResults.length) resolve([...partialResults])
      else reject(new Error('搜尋逾時'))
    }, SEARCH_TIMEOUT)
  })

  // 統一處理結果、失敗快取清除與計時器釋放，呼叫端只需等待 Promise。
  async function waitForResults(): Promise<Restaurant[]> {
    try {
      // race 採用最先完成的結果：Google 回覆，或等待逾時。
      // 它不會取消 Google 請求，但晚到的回覆不會改變這次結果。
      return await Promise.race([googleRequest, timeout])
    } catch (error) {
      // 只移除自己這次的快取，不誤刪同座標後來建立的新請求。
      if (cache.get(cacheKey)?.promise === pendingSearch) {
        cache.delete(cacheKey)
      }
      throw error // 交給 Hook 顯示錯誤，讓使用者可以重試。
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const pendingSearch = waitForResults()
  // 限制快取數量，探索多個中心點時淘汰最早加入的項目。
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }
  cache.set(cacheKey, {
    promise: pendingSearch,
    expires: Date.now() + CACHE_DURATION,
  })
  return pendingSearch
}
