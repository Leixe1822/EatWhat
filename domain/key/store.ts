import { create } from 'zustand'

export type KeyStore = {
  key: string | null
  loading: boolean
  storageError: string | null
}

const useKeyStore = create<KeyStore>(() => ({
  key: null,
  loading: true,
  storageError: null,
}))

export default useKeyStore
const STORAGE_KEY = 'map-key-store'

// 格式檢查不代表 Google 已授權；實際權限由載入與搜尋結果判斷。
export function isKeyFormatValid(value: string) {
  const trimmedKey = value.trim()
  return /^AIza[\w-]{35}$/.test(trimmedKey)
}

export function hydrateKey() {
  if (!useKeyStore.getState().loading) {
    return
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    const savedKey = saved?.state?.key
    let key: string | null = null
    if (typeof savedKey === 'string' && isKeyFormatValid(savedKey)) {
      key = savedKey.trim()
    }
    useKeyStore.setState({ key, loading: false })
  } catch {
    useKeyStore.setState({
      loading: false,
      storageError: '無法讀取已儲存的金鑰，請重新輸入。',
    })
  }
}

export function setKey(value: string) {
  const key = value.trim()
  if (!isKeyFormatValid(key)) {
    return false
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { key }, version: 0 })
    )
    useKeyStore.setState({ key, storageError: null })
    return true
  } catch {
    useKeyStore.setState({
      storageError: '無法儲存金鑰，請允許網站使用瀏覽器儲存空間。',
    })
    return false
  }
}

export function clearKey() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    useKeyStore.setState({ key: null, storageError: null })
    return true
  } catch {
    useKeyStore.setState({
      storageError: '無法清除已儲存的金鑰，請檢查瀏覽器儲存設定。',
    })
    return false
  }
}
