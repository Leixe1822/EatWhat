import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// API Key 領域的共用狀態；操作函式獨立匯出，不存放在 state 內。
export type KeyStore = {
  // null 表示尚未提供 Key，或使用者已清除 Key。
  key: string | null
  // 表示持久化資料是否仍在還原，與 Google Maps 的載入狀態無關。
  loading: boolean
}

// 初次建立 store 時先等待儲存資料還原，再決定是否顯示地圖。
const defaultKeyStore: KeyStore = {
  key: null,
  loading: true,
}

// persist 預設使用瀏覽器 localStorage；未設定 partialize，因此兩個欄位都會保存。
const useKeyStore = create<KeyStore>()(
  persist(() => defaultKeyStore, {
    name: 'map-key-store', // localStorage 中用來識別此 store 的名稱。
    // 外層回呼在還原前執行，回傳的回呼在還原結束後執行。
    onRehydrateStorage: () => state => {
      // 成功取得 state 才結束 loading；目前沒有另行處理還原失敗的情況。
      if (state) state.loading = false
    },
  }),
)

export default useKeyStore

// 可在表單事件等位置直接呼叫；更新後會通知訂閱者並觸發持久化。
const setKey = (key: string) => {
  useKeyStore.setState({ key })
}

// 將已保存的 Key 改為 null，不會刪除整個 localStorage 項目。
const clearKey = () => {
  useKeyStore.setState({ key: null })
}

export { setKey, clearKey }
