'use client'

// 手機底部面板：提供三段高度、拖曳吸附與鍵盤操作，內容由父元件傳入。
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// 高度以地圖容器的百分比表示；拖曳結束後吸附到這三個位置。
export const COLLAPSED_HEIGHT = 15
export const HALF_OPEN_HEIGHT = 50
const EXPANDED_HEIGHT = 90
export const SHEET_HEIGHTS = [COLLAPSED_HEIGHT, HALF_OPEN_HEIGHT, EXPANDED_HEIGHT]

type MobileSheetProps = {
  isLoading: boolean
  height: number
  onHeightChange: (height: number) => void
  onDraggingChange: (dragging: boolean) => void
  count: number
  children: ReactNode
}

// 保存按下當下的座標與尺寸；每次移動都相對同一起點計算，避免誤差累積。
type DragStart = {
  pointerY: number
  sheetHeight: number
  containerHeight: number
}

// 輔助工具讀出語意高度，避免只朗讀百分比數字。
function getHeightLabel(height: number) {
  if (height <= COLLAPSED_HEIGHT) return '收合'
  if (height >= EXPANDED_HEIGHT) return '展開'
  return '半開'
}

// 放開把手後吸附到最近的預設高度；等距時保留較前面的較低高度。
function getNearestHeight(height: number) {
  return SHEET_HEIGHTS.reduce((nearest, candidate) => {
    const candidateDistance = Math.abs(candidate - height)
    const nearestDistance = Math.abs(nearest - height)
    return candidateDistance < nearestDistance ? candidate : nearest
  })
}

// 只有把手攔截拖曳；清單保留原生觸控捲動，不干擾地圖手勢。
export default function MobileSheet({
  isLoading,
  height,
  onHeightChange,
  onDraggingChange,
  count,
  children,
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLElement>(null)
  const dragStart = useRef<DragStart | null>(null)
  const isCollapsed = height <= COLLAPSED_HEIGHT
  const isExpanded = height >= EXPANDED_HEIGHT
  const nextExpandedHeight = height < HALF_OPEN_HEIGHT ? HALF_OPEN_HEIGHT : EXPANDED_HEIGHT
  const nextCollapsedHeight = height > HALF_OPEN_HEIGHT ? HALF_OPEN_HEIGHT : COLLAPSED_HEIGHT

  // 上下鍵逐段調整；Home 與 End 直接切到最小與最大高度。
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let nextHeight: number

    switch (event.key) {
      case 'Home':
        nextHeight = COLLAPSED_HEIGHT
        break
      case 'End':
        nextHeight = EXPANDED_HEIGHT
        break
      case 'ArrowUp':
        nextHeight = nextExpandedHeight
        break
      case 'ArrowDown':
        nextHeight = nextCollapsedHeight
        break
      default:
        return
    }

    event.preventDefault()
    onHeightChange(nextHeight)
  }

  function handleDragStart(event: PointerEvent<HTMLDivElement>) {
    // 指標離開把手範圍後仍接收事件，確保拖曳可正常結束。
    event.currentTarget.setPointerCapture(event.pointerId)
    onDraggingChange(true)
    const mapContainer = sheetRef.current?.parentElement
    dragStart.current = {
      pointerY: event.clientY,
      sheetHeight: height,
      containerHeight: mapContainer?.clientHeight || window.innerHeight,
    }
  }

  function handleDragMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return

    // 向上拖曳會增加高度，將像素位移換算成容器高度的百分比。
    const movedPixels = start.pointerY - event.clientY
    const heightChange = (movedPixels / start.containerHeight) * 100
    const nextHeight = start.sheetHeight + heightChange
    onHeightChange(Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, nextHeight)))
  }

  function handleDragEnd() {
    dragStart.current = null
    onDraggingChange(false)
    onHeightChange(getNearestHeight(height))
  }

  // 瀏覽器取消手勢時回到半開，並恢復父層的過場動畫。
  function handleDragCancel() {
    dragStart.current = null
    onDraggingChange(false)
    onHeightChange(HALF_OPEN_HEIGHT)
  }

  return (
    <Box
      ref={sheetRef}
      component="section"
      aria-label="附近餐廳面板"
      sx={{
        position: 'absolute',
        zIndex: 3,
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--sheet-size)',
        transition: theme => theme.transitions.create('height', {
          duration: 'var(--mobile-motion-duration)',
          easing: theme.transitions.easing.easeInOut,
        }),
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'white',
        border: '2px solid',
        borderColor: 'divider',
        borderBottom: 0,
        borderRadius: '28px 28px 0 0',
        pb: 'env(safe-area-inset-bottom)',
        overflow: 'hidden',
        boxShadow: '0 -4px 20px #0002',
      }}
    >
      <Box
        role="slider"
        tabIndex={0}
        aria-label="拖曳調整餐廳面板高度"
        aria-valuemin={COLLAPSED_HEIGHT}
        aria-valuemax={EXPANDED_HEIGHT}
        aria-valuenow={height}
        aria-valuetext={getHeightLabel(height)}
        onKeyDown={handleKeyDown}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragCancel}
        sx={{
          flexShrink: 0,
          height: 44,
          touchAction: 'none',
          cursor: 'ns-resize',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box sx={{ width: 42, height: 5, bgcolor: 'divider', borderRadius: 4 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, flexShrink: 0 }}>
        <Typography component="h1" sx={{ flex: 1, fontWeight: 800 }} aria-live="polite">
          {isLoading ? '搜尋中...' : `附近餐廳（${count}）`}
        </Typography>
        <IconButton
          aria-label="展開餐廳面板"
          disabled={isExpanded}
          onClick={() => onHeightChange(nextExpandedHeight)}
          sx={{ width: 44, height: 44 }}
        >
          <ExpandLessIcon />
        </IconButton>
        <IconButton
          aria-label="收合餐廳面板"
          disabled={isCollapsed}
          onClick={() => onHeightChange(nextCollapsedHeight)}
          sx={{ width: 44, height: 44 }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: isCollapsed ? 'none' : 'flex',
          flex: 1,
          minHeight: 0,
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
