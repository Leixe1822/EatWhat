'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import useKeyStore from '@/domain/key/store'
import { describeSearchError } from '@/domain/map/searchError'
import { updateCenter } from './store'
import { getCurrentCenter, isValidCenter, type Center } from './location'

// 只在 APIProvider 內使用；負責取得中心點，不呼叫 Places API。
export default function useLocationSearch() {
  const geocoding = useMapsLibrary('geocoding')
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
  async function locate(useLocation = false) {
    if (locked.current) {
      return
    }
    if (!useKeyStore.getState().ready) {
      setError('Google Maps 尚未載入完成，請稍候。')
      return
    }
    if (!useLocation && !query.trim()) {
      setError('請輸入地址、地標或地區。')
      return
    }
    if (!useLocation && !geocoding) {
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
      } else {
        // 在使用前再次縮小型別，避免使用讓 TypeScript 跳過檢查的驚嘆號。
        if (!geocoding) {
          throw new Error('地址查詢服務尚未載入')
        }
        // 逾時只結束此次等待；晚到的回覆不會再觸發導航。
        const response = await Promise.race([
          new geocoding.Geocoder().geocode({ address: query.trim(), region: 'TW' }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('地址查詢逾時，請稍後重試。')), 15000)
          }),
        ])
        if (!response.results[0]) {
          throw new Error('找不到這個地點，請換個地址或地標。')
        }
        center = response.results[0].geometry.location.toJSON()
      }
      if (!active.current || !useKeyStore.getState().ready) {
        return
      }
      if (!isValidCenter(center)) {
        throw new Error('取得的位置不合法，請重新選擇地點。')
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
  return { query, setQuery, status, error, locate, geocodingReady: Boolean(geocoding) }
}
