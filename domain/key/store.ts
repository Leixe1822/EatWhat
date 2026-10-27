import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'

// Zustand 保存跨元件共用的狀態；輸入框草稿仍留在 KeySettings 的 useState。
export type KeyStore = {
  key: string | null
  loading: boolean // Google Maps 是否正在載入。
  ready: boolean // 本次頁面是否已成功載入 Maps。
  error: string | null
  storageError: string | null // localStorage 讀寫錯誤，與 Google 授權錯誤分開。
  hydrated: boolean // 是否已嘗試從瀏覽器還原金鑰。
}

// 延後至瀏覽器掛載才讀取；只保存 key，不保存上次的授權結果。
let clearing = false
const storage: PersistStorage<Pick<KeyStore, 'key'>> = {
  getItem: name => {
    const value = localStorage.getItem(name)
    if (!value) {
      return null
    }
    return JSON.parse(value)
  },
  setItem: (name, value) => {
    if (clearing) {
      return
    }
    try {
      localStorage.setItem(name, JSON.stringify(value))
    }
    catch {
      // 延到這次寫入結束後才更新警告；只有還沒有警告時才更新，避免無限重試。
      queueMicrotask(() => {
        const state = useKeyStore.getState()
        if (!state.storageError) {
          useKeyStore.setState({ storageError: '瀏覽器無法保存金鑰；本次仍可使用，重新整理後可能需要再次輸入。' })
        }
      })
    }
  },
  removeItem: name => localStorage.removeItem(name),
}
// create 建立 store；persist 在外面加上保存／還原功能。
const useKeyStore = create<KeyStore>()(persist((): KeyStore => ({
  key: null,
  loading: false,
  ready: false,
  error: null,
  storageError: null,
  hydrated: false,
}), {
  name: 'map-key-store',
  storage,
  // Next.js 也會在伺服器 render，所以等 MapsGate 掛載後才存取 localStorage。
  skipHydration: true,
  // 只保存金鑰，每次重新整理都必須重新確認 Maps 能否載入。
  partialize: state => ({ key: state.key }),
  merge: (saved, current) => {
    const value = (saved as { key?: unknown } | null)?.key
    let key: string | null = null
    if (typeof value === 'string' && value.trim()) {
      key = value.trim()
    }
    return { ...current, key, loading: Boolean(key), ready: false, error: null }
  },
  onRehydrateStorage: () => (_state, error) => {
    const updates: Partial<KeyStore> = { hydrated: true }
    if (error) {
      updates.storageError = '無法讀取已保存的金鑰，請重新輸入或清除網站儲存資料。'
    }
    useKeyStore.setState(updates)
  },
}))
export default useKeyStore

export function hydrateKey() {
  if (!useKeyStore.getState().hydrated) {
    void useKeyStore.persist.rehydrate()
  }
}
// 回傳 true 表示已接受金鑰並開始載入，不代表 Google 已驗證成功。
export function setKey(value: string) {
  if (!useKeyStore.getState().hydrated || useKeyStore.getState().key) {
    return false
  }
  const key = value.trim()
  if (!key) {
    useKeyStore.setState({ error: '請輸入 Google Maps API Key。' })
    return false
  }
  useKeyStore.setState({ key, loading: true, ready: false, error: null })
  return true
}
export function markMapsReady() {
  const state = useKeyStore.getState()
  // 逾時或授權失敗後，即使晚到 onLoad 也不能把功能重新打開。
  if (!state.key || state.error) {
    return
  }
  useKeyStore.setState({ loading: false, ready: true })
}
export function failMaps(message: string) {
  if (!useKeyStore.getState().key) {
    return
  }
  useKeyStore.setState({ loading: false, ready: false, error: message })
}
export function restartMaps() {
  window.location.reload()
}
export function clearSavedKey() {
  try {
    // 不在目前 document 更換 key，避免重複載入 Google 全域程式庫。
    localStorage.removeItem('map-key-store')
    clearing = true
    window.location.reload()
  } catch {
    useKeyStore.setState({ storageError: '無法清除已保存的金鑰，請在瀏覽器網站設定中手動清除儲存資料。' })
  }
}
