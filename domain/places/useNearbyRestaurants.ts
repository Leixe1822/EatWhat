'use client'

import { useEffect, useState } from 'react'
import type { Center } from '@/domain/map/location'
import type { Restaurant } from './store'
import { fetchNearby, SEARCH_RADIUS } from './nearby'

// status 決定畫面顯示載入中、結果，還是錯誤。
type NearbySearchResult = {
  request?: string // 此結果屬於哪一個中心點、半徑與重試次數。
  status: 'library' | 'searching' | 'success' | 'error'
  restaurants: Restaurant[]
  error: string | null
}
const initialResult: NearbySearchResult = { status: 'library', restaurants: [], error: null }

// 呼叫端須在 Maps ready 後掛載，沿用既有 APIProvider 所載入的 Google API。
export default function useNearbyRestaurants(center: Center, radius = SEARCH_RADIUS) {
  const [result, setResult] = useState<NearbySearchResult>(initialResult)
  // 按下重試時增加數字，讓 effect 再執行一次。
  const [attempt, setAttempt] = useState(0)
  const { lat, lng } = center
  // 同座標重試也必須有不同識別值，避免短暫顯示上次結果。
  const request = `${lat},${lng}:${radius}:${attempt}`

  useEffect(() => {
    // 每次 effect 有自己的 active；切換中心或半徑後，忽略舊請求的回覆。
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined

    async function search() {
      setResult({ ...initialResult, request })
      try {
        // 手動等待 library 可捕捉載入 rejection，不留下未處理的 Promise。
        const library = await Promise.race([
          google.maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Places 程式庫載入逾時')), 15000)
          }),
        ])
        clearTimeout(timer)
        if (!active) {
          return
        }
        setResult({ request, status: 'searching', restaurants: [], error: null })
        // refresh=true：切回之前的距離或按重試時，也重新查詢 Google。
        const restaurants = await fetchNearby(library, { lat, lng }, radius, true)
        if (active) {
          setResult({ request, status: 'success', restaurants: [...restaurants], error: null })
        }
      } catch {
        if (active) {
          setResult({
            request,
            status: 'error',
            restaurants: [],
            error: '無法取得附近餐廳。請檢查網路、Places API (New)、金鑰權限、帳單或配額後重試。',
          })
        }
      } finally {
        clearTimeout(timer)
      }
    }
    // effect 本身不能是 async；在裡面啟動 async 函式。錯誤已由 catch 處理。
    void search()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [lat, lng, radius, attempt, request])

  function retry() {
    setAttempt(previousAttempt => previousAttempt + 1)
  }
  // effect 要到 render 後才執行；先阻擋舊座標資料，避免閃現舊標記。
  let visibleResult = initialResult
  if (result.request === request) {
    visibleResult = result
  }
  return { ...visibleResult, retry }
}
