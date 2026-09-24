import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type KeyStore = {
  key: string | null
  loading: boolean
}

const defaultKeyStore: KeyStore = {
  key: null,
  loading: true,
}

const useKeyStore = create<KeyStore>()(
  persist(() => defaultKeyStore, {
    name: 'map-key-store',
    onRehydrateStorage: () => state => {
      if (state) state.loading = false
    },
  }),
)

export default useKeyStore

const setKey = (key: string) => {
  useKeyStore.setState({ key })
}

const clearKey = () => {
  useKeyStore.setState({ key: null })
}

export { setKey, clearKey }
