'use client'

// 薄包裝元件：將所有 props 原樣交給套件 APIProvider，不額外載入另一份 Maps。

import { APIProvider } from '@vis.gl/react-google-maps'

// 建立專案共用的 Client Component 入口，提供 Google Maps API 環境。
// typeof APIProvider 沿用原元件型別；所有 props（含 children）原樣往內傳。
const APIProviderShell: typeof APIProvider = props => {
  return <APIProvider {...props} />
}

export default APIProviderShell
