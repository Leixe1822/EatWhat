// 負責向 Google 取得附近餐廳；這個檔案不直接控制 React 畫面。
import type { Restaurant } from './store'
import { isValidCenter, type Center } from '@/domain/map/location'

export const SEARCH_RADIUS = 3000 // 公尺，等於 3 公里。
export const MAX_RESULTS = 20 // 單次最多 20 筆，不代表範圍內的全部餐廳。
const CACHE_DURATION = 60000 // 同一中心點的結果保留 60 秒。
const SEARCH_TIMEOUT = 20000 // 最多等待 20 秒。
const MAX_CACHE_ENTRIES = 20

type CachedSearch = {
  promise: Promise<Restaurant[]>
  expires: number
}

// Map 是 JavaScript 的鍵值表，不是 Google 地圖。
// 保存 Promise 可以讓「同座標、同時發生」的搜尋共用一次 API 請求。
const cache = new Map<string, CachedSearch>()

function convertPlacesToRestaurants(places: google.maps.places.Place[]): Restaurant[] {
  const restaurants: Restaurant[] = []
  const seenIds = new Set<string>() // Set 用來記錄已加入的餐廳 ID，避免重複。

  for (const place of places) {
    if (!place.location || seenIds.has(place.id)) {
      continue
    }

    const location = place.location.toJSON()
    if (!isValidCenter(location)) {
      continue
    }

    seenIds.add(place.id)
    // ?? 只在資料是 null 或 undefined 時使用預設值；評分 0 不會被取代。
    restaurants.push({
      id: place.id,
      name: place.displayName ?? '未提供名稱',
      address: place.formattedAddress ?? '未提供地址',
      location,
      rating: place.rating ?? null,
      uri: place.googleMapsURI ?? null,
    })
  }
  return restaurants
}

export function fetchNearby(library: google.maps.PlacesLibrary, center: Center): Promise<Restaurant[]> {
  if (!isValidCenter(center)) {
    return Promise.reject(new Error('無效中心點'))
  }

  const cacheKey = `${center.lat},${center.lng}`
  const cachedSearch = cache.get(cacheKey)
  if (cachedSearch && cachedSearch.expires > Date.now()) {
    return cachedSearch.promise
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  // 保留下一個微任務才送出請求的時序：先登記快取，再呼叫 Google。
  // 這也會把同步拋出的錯誤轉成 Promise 的失敗結果，交給下方 catch 處理。
  const googleRequest = Promise.resolve().then(async () => {
    const response = await library.Place.searchNearby({
      fields: ['id', 'displayName', 'location', 'formattedAddress', 'rating', 'googleMapsURI'],
      locationRestriction: { center, radius: SEARCH_RADIUS },
      includedTypes: ['restaurant'],
      maxResultCount: MAX_RESULTS,
    })
    return convertPlacesToRestaurants(response.places)
  })
  // Promise<never> 表示這個 Promise 只會失敗，不會回傳成功資料。
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('搜尋逾時')), SEARCH_TIMEOUT)
  })

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
