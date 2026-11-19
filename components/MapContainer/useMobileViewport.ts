'use client'

import { useEffect, useRef } from 'react'

// 將手機實際可視區域同步至容器，讓軟鍵盤與網址列變化只影響排版。
export default function useMobileViewport(isMobile: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) return

    // 不支援 visualViewport 時，退回動態視窗高度 100dvh。
    const viewport = window.visualViewport

    function updateViewport() {
      const container = containerRef.current
      if (!container) return

      const height = viewport ? `${viewport.height}px` : '100dvh'
      const top = viewport ? `${viewport.offsetTop}px` : '0px'
      container.style.setProperty('--mobile-height', height)
      container.style.setProperty('--mobile-top', top)
    }

    updateViewport()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)

    // 切回桌面或卸載時解除監聽，避免保留失效 DOM 的更新流程。
    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
    }
  }, [isMobile])

  return containerRef
}
