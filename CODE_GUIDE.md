# EatWhat 初學者程式閱讀指南

先跟著使用者的一次操作閱讀，不必一次看懂全部檔案。程式中的繁體中文註解會解釋每個檔案的用途，以及為什麼需要某些防護。

## 1. 看懂首頁

1. `app/layout.tsx`：所有頁面共用的外層，提供字型、MUI 主題與 Google Maps 載入管理。
2. `app/page.tsx`：首頁入口，只負責組裝元件。
3. `components/LandingPage/LandingPage.tsx`：連接畫面、搜尋 Hook 與金鑰設定視窗。
4. `components/LandingPage/HomeHero.tsx`：左右欄版面、標題、輸入框與按鈕。
5. `styles/theme.ts`：全站顏色、字體、圓角與元件樣式。首頁右側綠色框由 `HomeHero.tsx` 負責，目前不使用插畫。

`props` 是父元件傳給子元件的資料或函式。`children` 是元件標籤之間的內容。輸入框的 `value` 顯示 state，`onChange` 收到輸入事件後更新 state。按鈕的 `onClick` 和表單的 `onSubmit` 則呼叫對應函式。

MUI 的 `sx` 用來描述外觀，`p` 是內距、`mx` 是左右外距、`bgcolor` 是背景色。`{ xs: 12, md: 6 }` 表示手機佔滿 12 欄、桌面佔 6 欄。這些是套件的標準寫法，因此保留並加上解釋。

## 2. 輸入金鑰

- `domain/key/store.ts`：Zustand 保存共用金鑰狀態，persist 只把 key 寫入 localStorage。
- `components/KeySettings/KeySettings.tsx`：輸入草稿及提交事件。
- `components/ApiKeyDialog/ApiKeyDialog.tsx`：Maps 尚未就緒時顯示遮罩。
- `shells/ProviderShell/MapsGate.tsx`：掛載後還原金鑰，再載入 Google Maps，處理授權失敗及逾時。
- `shells/ProviderShell/APIProvider.tsx`：將 props 傳給套件的 APIProvider。

hydration 在這個 store 的意思是「從 localStorage 還原資料」。它不等於 Google 驗證成功，所以 ready 不會一起保存。更換金鑰必須重載頁面，避免同一頁重複載入不同的 Google Maps 金鑰。

## 3. 搜尋地址與定位

- `domain/map/useLocationSearch.ts`：首頁呼叫的 Hook，分別處理地址和目前位置，再共用更新中心點及跳頁步驟。
- `domain/map/location.ts`：座標驗證、URL 解析、瀏覽器定位。
- `domain/map/searchError.ts`：分類錯誤，遮蔽診斷訊息中的金鑰。
- `domain/map/store.ts`：跨元件共享搜尋中心與 Google 地圖實例。
- `domain/map/config.ts`：既有預設座標及縮放。

成功後，座標同時存入 Zustand 和 URL：Zustand 供元件共享，URL 讓重新整理後仍能還原位置。API Key 不放入 URL。

## 4. 第二頁餐廳搜尋

1. `app/restaurants/page.tsx`：路由入口，用 Suspense 提供等待畫面。
2. `components/RestaurantsPage/RestaurantsPage.tsx`：驗證網址座標，決定顯示提示或地圖。
3. `domain/places/useNearbyRestaurants.ts`：中心點改變時搜尋，管理載入、錯誤與重試狀態。
4. `domain/places/nearby.ts`：呼叫 Google、整理餐廳資料、共用重複請求及限制等待時間。
5. `components/MapContainer/MapContainer.tsx`：產生標記、清單、範圍圓及資訊視窗。
6. `components/MapContainer/config.ts`：Map ID 設定。真正隱藏底圖商家需搭配 Google Cloud 地圖樣式。

注意：`domain/places/store.ts` 是保留的舊版 1 公里流程及隨機選餐廳功能，目前第二頁使用上述 3 公里流程。新版仍共用其中的 Restaurant 型別，沒有把舊功能刪掉。

## 常見語法

| 語法 | 意思 |
| --- | --- |
| `useState` | 記住元件資料，更新後重新顯示畫面 |
| `useRef` | 記住資料，但修改它不會觸發重畫，例如防止重複提交的鎖 |
| `useEffect` | 畫面提交後執行同步工作；回傳函式用來清理計時器或停用舊請求 |
| `async / await` | 用由上而下的寫法等待非同步結果，不會把整個瀏覽器卡住 |
| `try / catch / finally` | 執行工作、處理失敗、最後清理 |
| `Promise.race` | 採用最先完成的結果；這裡用來比較 API 回覆和逾時 |
| `Map` / `Set` | JavaScript 的鍵值表／不重複集合，不是 Google 地圖 |
| `?.` | 物件不存在時不繼續存取，回傳 undefined |
| `??` | 只有 null 或 undefined 才使用右邊的預設值 |
| `...state` | 複製物件既有欄位，再覆寫需要更新的欄位 |
| `type` | 說明資料應有哪些欄位，方便 TypeScript 提早檢查 |
| `Partial<T>` | T 的所有欄位都可省略，適合只更新部分狀態 |
| `Pick<T, 'key'>` | 只取 T 裡的 key 欄位型別 |
| `unknown` | 尚未確認的外部資料，檢查型別後才能使用 |
| `void search()` | 啟動非同步工作但不在當下等待；函式內仍須處理錯誤 |

不要為了縮短程式移除 active、快取或計時器清理。Google 請求可能比下一次搜尋更晚回來，這些程式碼用來防止錯誤資料覆蓋目前畫面。

## 設定與測試

- `index.ts`：資料夾的統一匯出入口，讓 import 路徑更短。
- `next.config.ts`：Next.js、靜態匯出及部署路徑設定。
- `eslint.config.mjs`：程式碼檢查規則。
- `tsconfig.json`：TypeScript 型別與路徑設定，原檔已有註解。
- `package.json`：依賴套件與 npm 指令；標準 JSON 不支援註解，所以不在裡面插入註解。
- `tests/state.test.mjs`：用假的 Google 資料與儲存空間驗證流程，不發送真實 API 請求。

套件、鎖定檔、`.next/`、`out/`、`next-env.d.ts` 及圖片不是手動改寫的應用程式碼，不需逐行加註解。

執行檢查：

```sh
npx tsc --noEmit
npm run lint
node --test tests/state.test.mjs
npx next build --webpack
```


## 本次整合的版面與套件變更

- `components/Logo.tsx`：兩頁共用的餐具圖示與 EatWhat. 品牌文字，點擊返回首頁。
- `components/RestaurantsPage/ResultsPanel.tsx`：左側搜尋結果面板，Menu 按鈕控制開闔，清單與地圖共用選取狀態。
- `components/MapContainer/MapContainer.tsx`：桌面左右兩欄，手機可收合清單；中心點與餐廳使用不同大小、顏色的 LocationOn 圖示。
- `components/LandingPage/HomeHero.tsx`：左右並排的探索／定位按鈕，定位使用 MyLocation 圖示；右側保留空白綠色面板。
- `app/layout.tsx`、`styles/theme.ts`：Outfit 用於英文品牌與小標，Noto Sans TC 用於主要文字；字型變數由根版型提供。
- `domain/map/config.ts`：共用預設縮放為 12；搜尋半徑則由 `domain/places/nearby.ts` 的 3000 公尺設定控制。
- `package.json`：新增與既有 MUI 相容的 `@mui/icons-material` 9.4.0，提供 Flatware、MyLocation、Menu、LocationOn 及返回圖示。
- `package-lock.json`：由 npm 自動記錄上述套件的精確版本與完整性資訊，請勿手動插入註解。

標準 JSON 不支援 `//` 或 `/* */` 註解，因此套件檔案的中文說明放在本段，確保 npm 仍可正常讀取。
