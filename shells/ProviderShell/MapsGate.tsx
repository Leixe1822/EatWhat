'use client'

// 共用載入入口：還原金鑰、監聽 Google 授權錯誤，並控制何時建立 APIProvider。
import { useEffect, type ReactNode } from 'react'
import APIProviderShell from './APIProvider'
import ApiKeyDialog from '@/components/ApiKeyDialog/ApiKeyDialog'
import useKeyStore, { failMaps, markMapsReady, hydrateKey } from '@/domain/key/store'

function loadError() {
  failMaps('Google Maps 載入失敗，請檢查網路、金鑰、網站來源限制與 Maps JavaScript API 設定，再重新載入重試。')
}

// 全站只由這裡載入 Google Maps，避免每個頁面各自載入。
export default function MapsGate({ children }: { children: ReactNode }) {
  const key = useKeyStore(state => state.key)
  const loading = useKeyStore(state => state.loading)

  useEffect(() => {
    // 授權錯誤不一定經過 APIProvider.onError，也可能在 onLoad 之後才發生。
    const target = window as Window & { gm_authFailure?: () => void }
    const previous = target.gm_authFailure
    const onAuthFailure = () => failMaps('Google Maps 授權失敗，請確認金鑰有效、Maps JavaScript API 已啟用、帳單及網站來源限制正確。')
    target.gm_authFailure = onAuthFailure
    // 先接好授權錯誤回呼，再還原金鑰並開始載入。
    hydrateKey()
    return () => {
      if (target.gm_authFailure === onAuthFailure) {
        target.gm_authFailure = previous
      }
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      return
    }
    const timer = window.setTimeout(() => failMaps('Google Maps 載入逾時，請檢查網路後重新載入並輸入金鑰。'), 20000)
    return () => window.clearTimeout(timer)
  }, [loading])

  const content = <>{children}<ApiKeyDialog /></>
  // Provider 在 ready 改變時仍保留，不因遮罩消失而重新載入。
  if (!key) {
    return content
  }
  return (
    <APIProviderShell
      apiKey={key}
      language="zh-TW"
      region="TW"
      onLoad={markMapsReady}
      onError={loadError}
    >
      {content}
    </APIProviderShell>
  )
}
