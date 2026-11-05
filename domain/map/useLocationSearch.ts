'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import useKeyStore from '@/domain/key/store'
import { describeSearchError } from '@/domain/map/searchError'
import { updateCenter } from './store'
import { getCurrentCenter, isValidCenter, type Center } from './location'

// 只在 APIProvider 內使用；地址與 Places 選項共用座標驗證及導航。
// 結果頁提供回呼以原地換中心；首頁未提供時維持原本導航。
export default function useLocationSearch(onLocated?: (center: Center) => void) {
  const places = useMapsLibrary('places')
  const router = useRouter()
  // useState 的值改變時 React 會更新畫面。
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'searching' | 'locating'>('idle')
  const [error, setError] = useState<string | null>(null)
  // useRef 立即記住數值但不觸發重畫；可在按鈕還沒變 disabled 前阻擋連點。
  const locked = useRef(false)
  // 離開首頁後不再更新 state，也不讓晚到的結果觸發跳頁。
  const active = useRef(true)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  // false：地址轉座標；true：使用瀏覽器定位。兩者共用後面的驗證與導航。
  async function locate(useLocation = false, prediction?: google.maps.places.PlacePrediction) {
    if (locked.current) {
      return
    }
    if (!useKeyStore.getState().ready) {
      setError('Google Maps 尚未載入完成，請稍候。')
      return
    }
    if (!useLocation && !prediction && !query.trim()) {
      setError('請輸入地址、地標或地區。')
      return
    }
    if (!useLocation && !prediction && !places) {
      setError('地址查詢服務尚未載入，請稍候再試；也可以使用目前位置。')
      return
    }
    locked.current = true
    setStatus(useLocation ? 'locating' : 'searching')
    setError(null)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      let center: Center
      if (useLocation) {
        center = await getCurrentCenter()
      } else if (prediction) {
        // 已選建議：提交時只要求 location 欄位，不額外取得其他地點詳情。
        const place = prediction.toPlace()
        await Promise.race([
          place.fetchFields({ fields: ['location'] }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('地址查詢逾時，請稍後重試。')), 15000)
          }),
        ])
        if (!place.location) {
          throw new Error('找不到這個地點，請換個地址或地標。')
        }
        center = place.location.toJSON()
      } else {
        // 在使用前再次縮小型別，避免使用讓 TypeScript 跳過檢查的驚嘆號。
        if (!places) {
          throw new Error('地址查詢服務尚未載入')
        }
        // 逾時只結束此次等待；晚到的回覆不會再觸發導航。
        // 未選建議：使用 Places Text Search，無須啟用 Geocoding API。
        const response = await Promise.race([
          places.Place.searchByText({
            textQuery: query.trim(),
            fields: ['location'],
            language: 'zh-TW',
            region: 'tw',
            maxResultCount: 1,
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('地址查詢逾時，請稍後重試。')), 15000)
          }),
        ])
        // 沿用直接搜尋的行為：採用最相關的第一個地點。
        const location = response.places[0]?.location
        if (!location) {
          throw new Error('找不到這個地點，請換個地址或地標。')
        }
        center = location.toJSON()
      }
      if (!active.current || !useKeyStore.getState().ready) {
        return
      }
      if (!isValidCenter(center)) {
        throw new Error('取得的位置不合法，請重新選擇地點。')
      }
      if (onLocated) {
        onLocated(center)
        locked.current = false
        setStatus('idle')
        return
      }
      // Zustand 供元件共享；URL 讓重新整理後仍能還原中心點。
      updateCenter(center)
      const params = new URLSearchParams({ lat: String(center.lat), lng: String(center.lng) })
      router.push(`/restaurants?${params.toString()}`)
      // 導航完成、元件卸載之前仍保持鎖定，避免連續送出。
    } catch (cause) {
      if (!active.current) {
        return
      }
      const failure = describeSearchError(cause, useKeyStore.getState().key, useLocation)
      if (process.env.NODE_ENV === 'development') {
        console.error('[EatWhat] 位置搜尋失敗', failure.diagnostic)
      }
      setError(failure.message)
      locked.current = false
      setStatus('idle')
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

  return { query, setQuery, status, error, locate, placesReady: Boolean(places) }
}
