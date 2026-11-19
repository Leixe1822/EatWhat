'use client'

// 地點建議 Hook：延遲查詢、共用搜尋工作階段，並防止舊建議覆蓋新輸入。
import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

// 只取得建議文字與地點識別；座標留到使用者提交搜尋時再查詢。
export default function usePlaceAutocomplete(query: string, enabled: boolean) {
  const places = useMapsLibrary('places')
  // 同一次輸入流程共用 token；提交或清空後開始新的工作階段。
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  // 除了 effect cleanup，重設 session 也必須讓尚未回覆的查詢失效。
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

  // 輸入剛變更、effect 尚未執行時，也不顯示上一個關鍵字的建議。
  const current = enabled && Boolean(query.trim()) && result.query === query
  return {
    options: current ? result.options : [],
    error: current ? result.error : null,
    resetSession,
  }
}
