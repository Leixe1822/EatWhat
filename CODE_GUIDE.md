# EatWhat 程式閱讀指南

先依一次使用流程閱讀，再查看各檔案內的繁體中文註釋。註釋主要解釋用途、資料單位、狀態變化與邊界條件；簡單語法不逐行重複說明。

## 頁面與共用環境

| 檔案 | 責任 |
| --- | --- |
| `app/layout.tsx` | 全站版型、字型、MUI 樣式快取與主題，以及 Maps 載入入口。 |
| `app/page.tsx` | 首頁路由，組裝 `LandingPage`。 |
| `app/restaurants/page.tsx` | 結果頁路由，以 Suspense 包住需要讀取 URL 的互動元件。 |
| `shells/ProviderShell/MapsGate.tsx` | 還原金鑰、載入 Google Maps，處理授權失敗與逾時。 |
| `shells/ProviderShell/APIProvider.tsx` | 原樣傳遞 props 給套件 Provider，統一 Client Component 入口。 |
| `shells/ProviderShell/index.ts` | 供外部從資料夾路徑匯入 Provider。 |
| `styles/theme.ts` | 全站顏色、字體、元件外觀與 MUI 過場設定。 |
| `components/Logo.tsx` | 共用品牌標誌與返回首頁連結。 |

`'use client'` 表示互動元件的客戶端邊界。`props` 是父元件傳入的資料或函式；`children` 是標籤之間的內容。畫面元件透過回呼通知父層，不自行保存另一份搜尋條件。

## 金鑰設定

| 檔案 | 責任 |
| --- | --- |
| `domain/key/store.ts` | Zustand 共用狀態，使用 persist 保存金鑰。 |
| `components/KeySettings/KeySettings.tsx` | 金鑰草稿、提交、重試與清除操作。 |
| `components/KeySettings/index.ts` | 表單元件匯出入口。 |
| `components/ApiKeyDialog/ApiKeyDialog.tsx` | Maps 未就緒時顯示不可關閉的設定遮罩。 |

只保存 `key`，不保存 `ready`。每次重新整理都重新載入 Maps；還原金鑰不代表授權成功。`clearing` 防止清除後、重載前的晚到事件把舊金鑰寫回儲存空間。

## 首頁與地點搜尋

| 檔案 | 責任 |
| --- | --- |
| `components/LandingPage/LandingPage.tsx` | 連接搜尋 Hook、首頁畫面與設定視窗。 |
| `components/LandingPage/HomeHero.tsx` | 首頁排版、搜尋卡片、地點建議及定位按鈕。 |
| `components/LandingPage/FoodMapIllustration.tsx` | SVG 插畫與 MUI `styled`／`keyframes` 浮動動畫。 |
| `components/LandingPage/FoodMapIllustration.module.css` | 插畫定位與尺寸；不處理動畫。 |
| `components/LandingPage/index.ts` | 首頁互動元件匯出入口。 |
| `domain/map/usePlaceAutocomplete.ts` | 等待輸入停止 300 毫秒後查詢建議，管理 session token 與過期回覆。 |
| `domain/map/useLocationSearch.ts` | 地址、建議或裝置定位轉座標；首頁導航，結果頁呼叫 `onLocated`。 |
| `domain/map/location.ts` | 座標型別、有效性驗證、URL 解析與瀏覽器定位。 |
| `domain/map/searchError.ts` | 對使用者顯示固定錯誤文案，診斷訊息遮蔽金鑰及 URL。 |
| `domain/map/store.ts` | 共用地圖實例與搜尋中心，不寫入 localStorage。 |
| `domain/map/config.ts` | 保留舊版預設相機設定；目前結果頁另行計算視角。 |

首頁選取建議時先暫存，提交才取得座標；手機結果頁選取建議則立即搜尋。`locked` 防止重複提交，`active` 與 `cancelled` 防止卸載或換條件後，舊請求覆蓋目前畫面。

## 附近餐廳資料流程

1. `RestaurantsPage` 從 URL 驗證中心點，保存距離、類別、價格、評分與營業狀態。
2. `useNearbyRestaurants` 在中心或任一選單條件改變時重新查詢。
3. `nearby.ts` 向 Google 取得資料，排除場所、去重並套用條件。
4. 清單與地圖標記共用同一批結果；載入時顯示「搜尋中...」與 Skeleton。
5. 點選餐廳只改變選取與地圖視角；拖曳搜尋中心才會更新位置及重新查詢。

| 檔案 | 責任 |
| --- | --- |
| `components/RestaurantsPage/RestaurantsPage.tsx` | URL、篩選狀態、錯誤提示與重試入口。 |
| `domain/places/useNearbyRestaurants.ts` | 載入狀態、請求識別、忽略過期回覆及重試。 |
| `domain/places/nearby.ts` | Nearby 請求、快取、逾時、轉換與最多三批補查。 |
| `domain/places/searchConfig.ts` | 共用預設搜尋半徑 3000 公尺，避免查詢與篩選互相依賴。 |
| `domain/places/cuisines.ts` | 料理分組及 Google 類型對應；未涵蓋的類型歸入其他。 |
| `domain/places/filters.ts` | 篩選型別、預設值、價格文字、球面直線距離與條件比對。 |
| `domain/places/openingHours.ts` | 使用店家時區及結構化營業時段，判斷查詢當下是否營業。 |
| `domain/places/store.ts` | 共用 `Restaurant` 型別；其餘搜尋與抽選函式保留舊版流程。 |

目前頁面以 `refresh: true` 查詢，因此切回先前條件也會重送。資料服務本身仍提供快取，鍵包含中心、距離、類別、價格、評分與狀態。

料理類別傳入 Google 的主要類型限制；價格、評分與營業狀態則在每批新資料取得後比對。首輪原始結果滿 20 筆、套用條件後不足時，才依既有策略補查。所有結果去重後最多保留 20 間，不保證補滿，也不代表範圍內所有餐廳。

`openNow` 的 `true`、`false`、`null` 分別代表營業、休息、未知，不能用一般真假判斷把未知當成休息。營業狀態在查詢時運算，不會自動每分鐘更新。`keyword` 是保留的本地篩選欄位，目前沒有對應輸入框。

## 結果清單與地圖互動

| 檔案 | 責任 |
| --- | --- |
| `components/RestaurantsPage/ResultsPanel.tsx` | 篩選控制、隨機按鈕、Skeleton、餐廳清單與選取捲動。 |
| `components/RestaurantsPage/MobileSearch.tsx` | 手機搜尋列、清除文字與目前位置按鈕。 |
| `components/RestaurantsPage/MobileSheet.tsx` | 手機面板的 15%、50%、90% 高度、拖曳吸附及鍵盤操作。 |
| `components/RestaurantsPage/LocationSearch.tsx` | 保留的搜尋表單元件，目前沒有掛載。 |
| `components/MapContainer/MapContainer.tsx` | 搜尋圈、相機縮放、標記、資訊卡及桌面清單開關。 |
| `components/MapContainer/useMobileViewport.ts` | 將手機可視高度與位移同步到 CSS 變數，處理鍵盤與網址列。 |
| `components/MapContainer/config.ts` | Map ID 與是否有自訂 ID 的設定。 |
| `components/MapContainer/index.ts` | 地圖元件及設定的匯出入口。 |

桌面開關使用 `Switch`，左側顯示 `ListAltIcon`。手機使用底部面板；拖曳時停用高度過場，放開後吸附到最近高度。面板、地圖及定位按鈕的過場共用 MUI 主題時間，並尊重減少動態效果設定。

隨機抽選保留所有篩選條件，只從本次結果抽選。搜尋期間保留按鈕外觀並以事件檢查暫停抽選；只有查詢完成且零筆時才呈現停用灰色。

搜尋中心與相機中心不同。`panTo` 只移動畫面；搜尋圈仍維持原本中心及半徑。自動視角使用 0.5、1、2 公里半徑的 60%，以及 3 公里半徑的 75% 計算取景，讓畫面更近；圈邊緣因此可能超出可視區。選取餐廳時保留資訊卡視角，不用搜尋圈縮放覆蓋它。

## 設定檔與套件

`package.json` 是標準 JSON，不能插入註釋；以下說明其內容，檔案本身保持 npm 可讀。

| 項目 | 用途 |
| --- | --- |
| `name`、`version`、`private` | 專案識別與版本；`private: true` 避免誤發佈到 npm。 |
| `scripts.dev` | `next dev`，啟動開發伺服器。 |
| `scripts.build` | `next build`，配合設定產生靜態輸出。 |
| `scripts.start` | `next start`；本專案採靜態匯出，部署時應由靜態主機提供 `out/`。 |
| `scripts.lint` | 執行 ESLint。 |
| `next`、`react`、`react-dom` | 路由、建置與畫面渲染。 |
| `@mui/material`、`@mui/icons-material` | 介面元件及圖示。 |
| `@mui/material-nextjs` | Next.js 與 MUI 的樣式快取整合，不是動畫套件。 |
| `@emotion/cache`、`@emotion/react`、`@emotion/styled` | MUI 的樣式產生與快取依賴。 |
| `@vis.gl/react-google-maps` | React 地圖元件、Provider 與 Google 程式庫 Hooks。 |
| `zustand` | 跨元件狀態與金鑰保存。 |
| `typescript`、`@types/node`、`@types/react`、`@types/react-dom` | 型別檢查與型別宣告。 |
| `eslint`、`eslint-config-next` | 靜態程式碼檢查。 |
| `babel-plugin-react-compiler` | 配合 Next.js 設定進行 React 編譯最佳化。 |

- `next.config.ts`：靜態匯出、部署前綴、React Compiler 與圖片設定。
- `eslint.config.mjs`：合併 Next.js、TypeScript 規則，排除生成檔。
- `tsconfig.json`：此設定格式允許註釋，原檔說明嚴格型別、模組解析及 `@/` 路徑。
- 各資料夾的 `index.ts`：統一匯出入口，不另建一份功能。
- `package-lock.json`、`next-env.d.ts`、`node_modules/`、`.next/`、`out/`：套件或工具管理，不手動加註釋。
- 圖片及圖示二進位檔沒有程式註釋；SVG 路徑以圖形區塊的用途說明，不逐個座標翻譯。

## 常見語法與檢查

| 語法 | 用途 |
| --- | --- |
| `useState` | 保存會影響畫面的狀態，更新後重新渲染。 |
| `useRef` | 保存 DOM 或同步旗標，修改值不觸發渲染。 |
| `useEffect` | 同步瀏覽器、地圖或非同步工作；回傳函式清理事件與計時器。 |
| `Promise.race` | 採用先完成的結果，不會自動取消另一個 API 請求。 |
| `?.` / `??` | 安全讀取可缺省值；只在 null 或 undefined 時使用預設。 |
| `Map` / `Set` | 鍵值快取與去重集合，與地圖元件 `Map` 不同。 |
| `sx` | MUI 樣式物件；`px` 是水平內距、`gap` 是間距。 |
| `minHeight: 0` | 允許 flex 子層縮小，使長清單在自己的區域內捲動。 |
| `aria-*` | 提供載入、控制項名稱與操作狀態給輔助工具。 |

`tests/state.test.mjs` 用假的 Google、定位與儲存空間測試資料邏輯，不使用真實配額。測試內的 TypeScript 載入器讓 Node 可以執行專案模組。

```sh
npx tsc --noEmit
npm run lint
node --test tests/state.test.mjs
```

新增註釋或整理版面時，保留既有操作、選項與 API 欄位。避免把商品文案改成實作說明；複雜程式先分行、釐清責任，再補上必要的原因。
