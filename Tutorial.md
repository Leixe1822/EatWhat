# Tutorial：專案架構與開發指南

這份文件寫給要在本專案基礎上繼續開發的學生，說明專案的架構規劃、關鍵套件的使用方式，以及開發時需要注意的地方。目標是讓你理解「為什麼這樣分層」，而不只是「哪裡放什麼檔案」。

## 1. 專案定位

Dine Pick 要做的事情很單純：**以某個中心點（指定地點 / 目前位置）呼叫 Google Places API，取得附近餐廳 → 篩選 → 標記在地圖上並列表呈現 → 讓使用者用隨機推薦的方式做決定**。

專案最終會以 `output: 'export'` 產生純靜態檔案並部署到 GitHub Pages，這代表：

- **沒有 Node.js 伺服器、沒有 API Route、沒有 Server Action**，所有邏輯（含呼叫 Google API）都必須在瀏覽器端（client）執行。
- 不能依賴伺服器端的 secret 環境變數；API Key 只能透過使用者輸入或建置時內嵌的方式取得，因此需特別注意金鑰的使用限制（見第 5 節）。

## 2. 資料夾架構與職責

```
app/          # App Router：路由、頁面組裝（page.tsx）、layout
components/   # 可重用的「視覺組件」，只負責畫面呈現與局部互動
domain/       # 業務領域邏輯：schema / store / api / hook
shells/       # 外層殼層：Provider、Layout wrapper 等橫切關注點
styles/       # MUI theme 等樣式設定
public/       # 靜態資源
```

### `app/`

App Router 的路由與頁面組裝層。頁面（`page.tsx`）應該盡量「薄」——負責把 `domain` 的 store / hook 與 `components` 的視覺組件組裝起來，避免把業務邏輯寫在頁面裡。

### `components/`

放**可重用的視覺組件**，例如 `MapContainer`。原則：

- 元件本身盡量是「無狀態展示」或只管理局部 UI 狀態（如 hover、展開/收合），不要在元件內直接操作跨頁面共享的業務狀態。
- 需要跨元件共享的狀態，透過 `domain` 的 store 取得，而不是用 props drilling 或 context 硬塞。
- 每個元件資料夾內以 `index.ts` 統一導出（見 `components/MapContainer/index.ts`），方便外部以 `@/components/MapContainer` 匯入，並隱藏內部檔案結構。

### `domain/`

**這是本專案的核心，也是你接下來開發的主戰場。** 按業務領域（例如 `key`、`map`，之後會新增 `places`、`filter`、`recommend` 等）切分子資料夾，每個子資料夾依需求可包含：

- `store.ts`：Zustand store，管理該領域的狀態與操作（見第 3 節）
- `schema.ts`：型別定義 / 資料結構（建議搭配 `zod` 等工具做執行期驗證，是否引入由你評估）
- `api.ts`：呼叫外部 API（例如 Google Places API）的封裝函式
- `hook.ts`：包裝 store selector 或組合多個 store 邏輯的自訂 hook

不是每個領域都需要上述四種檔案，依實際需求增減即可。

### `shells/`

放「外層殼層」元件，通常是包住整個 App 或某個區塊的 Provider（例如 `ProviderShell/APIProvider.tsx` 包裝 `@vis.gl/react-google-maps` 的 `APIProvider`）。特色是：**這一層通常需要 `'use client'`，且職責是「提供環境／上下文」，而不是畫面本身**。

### `styles/`

MUI 主題設定（`theme.ts`）。若需要客製化元件樣式、色彩、字體，統一在這裡調整，避免在各元件中零散覆寫。

視覺實作優先使用 MUI：版面以 `Box`／`Stack` 排列，文字使用 `Typography`，表單與操作使用 `TextField`／`Button`。頁面專屬尺寸和響應式排列放在 `sx`，共用色彩、字體與元件互動樣式放在 theme。只有 MUI 無法合理處理的情境才另寫 CSS；根版型的 `html`／`body` 與 `next/font` 字體 class 保留框架原生方式。

## 3. Store 設計慣例（務必遵守）

參考 `domain/key/store.ts` 與 `domain/map/store.ts`，本專案的 Zustand store 採用「**state 與 action 分離**」的寫法，理由是：**不希望 action 被強制以 hook 的方式呼叫**（action 應該可以在任意地方直接呼叫，例如事件處理函式、非元件的工具函式，而不需要在 React 元件內才能使用）。

寫法範本：

```ts
import { create } from 'zustand'

// 1. 定義 state 的型別與預設值
export type FooStore = {
  value: string | null
}

// 2. 建立 store，只放「狀態」
const useFooStore = create<FooStore>(() => ({
  value: null,
}))

export default useFooStore

// 3. action 是獨立的具名函式，直接呼叫 useFooStore.setState / getState
//    而不是包裝成回傳 action 的 hook（例如 useFooActions）
const setValue = (value: string | null) => {
  useFooStore.setState({ value })
}

export { setValue }
```

**元件中使用時**：

```ts
import useFooStore, { setValue } from '@/domain/foo/store'

// 讀取狀態：一定要用 selector，避免不必要的重渲染
const value = useFooStore(s => s.value)

// 呼叫 action：直接 import 函式呼叫，不需要透過 hook
setValue('bar')
```

需要持久化的 store（例如 API Key）可搭配 `zustand/middleware` 的 `persist`，並透過 `onRehydrateStorage` 處理 SSR / hydration 期間的 loading 狀態（參考 `domain/key/store.ts`）。

需要跨 store 互動時（例如 `domain/map/store.ts` 的 `updateCenter` 會同時操作 `map` 實例），直接在 action 內用 `useXxxStore.getState()` 取得另一個 store 的當下狀態即可，不需要額外設計事件系統。

## 4. 地圖與 Google Maps API 相關套件

### `@vis.gl/react-google-maps`

- `APIProvider`（見 `shells/ProviderShell/APIProvider.tsx`）：需要在最外層提供 API Key 後，內部元件才能使用地圖相關功能。目前是等使用者於畫面輸入 Key 後才掛載 `APIProvider`，因此地圖相關元件都應該假設「有可能還沒有 API Key」，做好對應的 loading / 空狀態處理。
- `Map`：地圖本身的元件，`mapId`、`defaultCenter`、`defaultZoom` 等設定集中放在 `components/MapContainer/config.ts` 的 `DEFAULT_CAMERA`，方便統一調整。
- 之後若要加上標記（Marker）、InfoWindow，建議在 `MapContainer` 內以子元件方式擴充，並透過 `domain` 的 store（例如未來的 `domain/places/store.ts`）取得要標記的餐廳資料，而不是把資料寫死在元件內。

### Google Places API

- Places API 的呼叫屬於前端直接呼叫（因為是純靜態站台），需注意：
  - 在 Google Cloud Console 為 API Key 設定 **HTTP referrer 限制**，避免金鑰被濫用。
  - 留意 API 的用量與費用，開發時建議加上快取或限制呼叫頻率（見下方 `use-debounce`）。
- 建議把呼叫邏輯封裝在對應 `domain` 子資料夾的 `api.ts`（例如 `domain/places/api.ts`），回傳處理過的資料結構給 store 使用，避免元件直接呼叫原始 API。

### `use-debounce`

用於「使用者輸入地點 / 拖曳地圖」等會頻繁觸發的操作，避免每次變動都立即打 API。目前 `package.json` 尚未安裝，開發到需要時再自行安裝：

```bash
npm install use-debounce
```

搭配範例（概念示意，實際請依 store 設計調整）：

```ts
import { useDebouncedCallback } from 'use-debounce'

const debouncedSearch = useDebouncedCallback((keyword: string) => {
  // 呼叫 domain/places/api.ts 的搜尋函式
}, 500)
```

## 5. API Key 使用注意事項

- 目前流程是使用者於首頁表單輸入 API Key，存入 `domain/key/store.ts`（以 `persist` 存到 `localStorage`）。這是教學情境下的簡化做法，**不適合直接用於正式對外服務**，正式環境應改用有 referrer 限制、且權限最小化的 Key，並考慮改由後端代理呼叫（但這會與目前「純靜態部署」的目標衝突，開發前請先想清楚取捨）。
- 不要把個人的正式 API Key 提交進版本控制，也不要記錄在 README、Tutorial 或程式碼註解中。

## 6. GitHub Pages 靜態部署注意事項

- `next.config.ts` 已設定 `output: 'export'`，並依 `NODE_ENV === 'production'` 套用 `basePath` / `assetPrefix`。部署前記得把 `PROJECT_NAME` 改成實際的 repository 名稱。
- 因為是靜態輸出，**不能使用**：Next.js 的 API Routes（`app/api/*`）、Server Actions、`next/image` 的伺服器端最佳化（已設定 `images.unoptimized: true`）、以及任何需要伺服器執行期的功能（例如 ISR）。
- 動態路由若要搭配 `output: 'export'`，需搭配 `generateStaticParams` 產生所有靜態頁面；目前專案為單頁應用，暫不涉及此問題，但擴充路由時請留意。

## 7. 建議的開發順序

依循「先資料層、後畫面層」的順序，比較容易維持 `domain` 與 `components` 的職責分離：

1. **`domain/places`**：定義餐廳資料的 `schema`，實作呼叫 Google Places API 的 `api.ts`，以及管理搜尋結果的 `store.ts`。
2. **`domain/filter`（或併入 `places`）**：篩選條件（如評分、距離、營業中）的狀態與邏輯。
3. **`components/`**：新增顯示餐廳列表的元件、地圖上標記餐廳位置的 Marker 元件，串接第 1、2 步的 store。
4. **`domain/recommend`**：隨機推薦邏輯（可以是單純的 action，從目前篩選結果中隨機挑一筆並更新對應 store）。
5. 最後再回頭檢視 `app/page.tsx`，把上述模組組裝起來，確保頁面本身維持簡潔。

## 8. 開發前的自我檢查清單

- 新增狀態時，是否放在對的 `domain` 子資料夾，且遵守「state 與 action 分離」的寫法？
- 元件是否只依賴 store 的 selector，而不是把資料以 props 一層層往下傳？
- 是否有考慮到「API Key 尚未輸入」「API 呼叫中」「API 呼叫失敗」等狀態的畫面呈現？
- 新增的功能是否相容於靜態匯出（沒有使用到伺服器端限定的 API）？
