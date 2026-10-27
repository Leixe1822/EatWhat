'use client'

// 金鑰遮罩：讀取 Zustand 的 ready；尚未載入 Maps 時保持開啟。
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import { alpha } from '@mui/material/styles'
import useKeyStore from '@/domain/key/store'
import KeySettings from '@/components/KeySettings'

export default function ApiKeyDialog() {
  const ready = useKeyStore(state => state.ready)
  return (
    <Dialog
      open={!ready}
      fullWidth
      maxWidth="sm"
      aria-labelledby="api-key-gate-title"
      slotProps={{
        backdrop: {
          sx: theme => ({
            backgroundColor: alpha(theme.palette.secondary.main, 0.45),
            backdropFilter: 'blur(4px)'
          })
        }
      }}
    >
      {/* 不提供 onClose 或關閉按鈕，Escape 與點背景都不會改變受控 open。 */}
      <DialogTitle id="api-key-gate-title">探索之前，先連上地圖。</DialogTitle>
      <DialogContent sx={{ pb: 4 }}><KeySettings /></DialogContent>
    </Dialog>
  )
}
