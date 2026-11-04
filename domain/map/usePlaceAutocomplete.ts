'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

// 只取得建議文字與地點識別；座標留到使用者提交搜尋時再查詢。
export default function usePlaceAutocomplete(query: string, enabled: boolean) {
  const places = useMapsLibrary('places')
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const generation = useRef(0)
  const [result, setResult] = useState<{
    query: string
    options: google.maps.places.PlacePrediction[]
    error: string | null
  }>({ query: '', options: [], error: null })

  // 更新代數讓尚未完成的舊請求失效，下一次輸入建立新的 session token。
  function resetSession() {
    generation.current += 1
    token.current = null
    setResult({ query: '', options: [], error: null })
  }

  useEffect(() => {
    if (!enabled || !places || !query.trim()) {
      token.current = null
      return
    }
    let cancelled = false
    const requestGeneration = generation.current
    // 停止輸入 300 毫秒後才發送請求；清理時取消計時並忽略晚到的回覆。
    const timer = setTimeout(async () => {
      token.current ??= new places.AutocompleteSessionToken()
      try {
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query.trim(),
          language: 'zh-TW',
          region: 'tw',
          sessionToken: token.current,
        })
        if (cancelled || requestGeneration !== generation.current) return
        setResult({
          query,
          options: suggestions.flatMap(item => item.placePrediction ? [item.placePrediction] : []),
          error: null,
        })
      } catch {
        if (cancelled || requestGeneration !== generation.current) return
        setResult({
          query,
          options: [],
          error: '地點建議暫時無法載入，你仍可輸入完整地址搜尋。請確認 Places API (New) 已啟用。',
        })
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, enabled, places])

  const current = enabled && Boolean(query.trim()) && result.query === query
  return {
    options: current ? result.options : [],
    error: current ? result.error : null,
    resetSession,
  }
}
