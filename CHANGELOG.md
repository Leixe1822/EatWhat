# EatWhat 變更紀錄

## 2026-11-04：Places 地址建議與文字搜尋整合

### 搜尋流程

- `domain/map/usePlaceAutocomplete.ts`：新增 Places API (New) 建議搜尋，使用繁體中文與台灣區域設定，加入 300 毫秒輸入延遲、session token、過期回覆排除及錯誤提示。
- `components/LandingPage/HomeHero.tsx`：地址欄位改用 MUI Autocomplete，保留自由輸入，支援建議選取並顯示 Google Maps 來源標示。
- `components/LandingPage/LandingPage.tsx`：選取建議只更新文字及暫存地點；提交表單時才取得座標，修改文字則清除先前選項。
- `domain/map/useLocationSearch.ts`：移除 Geocoding API，未選建議時改用 Place.searchByText 取得第一筆地點的 location；已選建議時呼叫 fetchFields，只要求 location。成功後更新 mapStore center 並導航，保留目前位置、逾時與重複提交防護。
- `domain/map/searchError.ts`：授權錯誤改提示檢查 Places API (New)，保留固定錯誤文案與診斷資訊遮蔽。

### 地圖與程式整理

- `domain/places/nearby.ts`：附近餐廳搜尋半徑由 3 公里改為 1 公里，仍最多回傳 20 筆。
- `domain/map/config.ts`：預設縮放由 12 改為 0.01。
- 地圖、餐廳頁與結果面板：整理變數及事件命名，抽出餐廳清單項目元件，保留清單收合、選取與地圖同步行為。
- 首頁、Logo、金鑰設定、MapsGate、store、主題與設定檔：整理排版及程式可讀性；補充新搜尋流程的中文註解。
- `tests/state.test.mjs`：更新 Places 授權提示斷言，將附近搜尋半徑測試同步為 1 公里。

驗證：TypeScript、全專案 ESLint、13 項自動化測試及 Git 差異空白檢查通過。本次未重新執行正式建置、真實 Google API 與瀏覽器視覺驗收。


## 2026-10-27：整合首頁、品牌與餐廳地圖探索

本次將開發中的功能整合為一筆提交，目標分支為 develop。

### 首頁與品牌

- `app/layout.tsx`：載入 Outfit、Noto Sans TC，提供字型變數及全站共用 MapsGate。
- `app/page.tsx`：使用既有 LandingPage 組裝首頁，保持 Server Component。
- `components/Logo.tsx`：新增餐具圖示、酸橙綠底塊與 EatWhat. 品牌文字，兩頁共用並可返回首頁。
- `components/LandingPage/LandingPage.tsx`：更新 Header 與設定視窗，移除舊介紹卡片、頁尾及舊版首頁餐廳流程，接上位置搜尋 Hook。
- `components/LandingPage/HomeHero.tsx`：新增 RWD 雙欄版面，探索與定位按鈕左右並排；定位使用 MyLocationIcon，右側只保留綠色圓角面板。
- `components/LandingPage/index.ts`：補充元件匯出入口的中文註解。
- `styles/theme.ts`：改為黑白 × 酸橙綠，Noto Sans TC 為主要字型，統一按鈕、卡片、輸入框、Dialog 與焦點樣式。
- 開發期間的 FoodIllustration 插畫已停用並移除；該檔案未曾提交，因此本次 Git 差異不會顯示刪除記錄。

### 金鑰與載入管理

- `domain/key/store.ts`：加入 persist 金鑰保存、手動 hydration、讀寫錯誤與載入狀態；只保存 key，不保存 ready。清除或更換金鑰時重載頁面。
- `shells/ProviderShell/MapsGate.tsx`：集中載入 Google Maps，處理 onLoad、onError、gm_authFailure 及載入逾時。
- `shells/ProviderShell/APIProvider.tsx`：沿用 APIProvider 包裝，補上用途與 props 說明。
- `components/ApiKeyDialog/ApiKeyDialog.tsx`：新增載入成功前不可直接關閉的金鑰遮罩。
- `components/KeySettings/KeySettings.tsx`：管理密碼欄位草稿、提交、載入及錯誤提示，提供重新載入與清除金鑰操作；表單事件改用 SubmitEvent。
- `components/KeySettings/index.ts`：補充匯出入口註解。

### 位置搜尋與餐廳地圖

- `domain/map/location.ts`：新增座標範圍與 URL 參數驗證，以及瀏覽器定位的成功／錯誤處理。
- `domain/map/useLocationSearch.ts`：新增 Geocoding 地址搜尋、目前位置、重複提交鎖、逾時處理及 /restaurants 導航。
- `domain/map/searchError.ts`：分類 Google 錯誤，開發診斷遮蔽金鑰與請求 URL。
- `domain/map/store.ts`：新增只更新搜尋中心的操作，拖曳搜尋中心時不重設縮放，補上用途註解。
- `domain/map/config.ts`：共用預設縮放由 16 改為 12，並補上中文說明。
- `app/restaurants/page.tsx`：新增餐廳頁路由，使用 Suspense 包住讀取 URL 的 Client Component。
- `components/RestaurantsPage/RestaurantsPage.tsx`：從 URL 還原中心點、同步 Zustand；保留返回鍵與 Logo，顯示搜尋狀態，拖曳後更新 URL。
- `components/RestaurantsPage/ResultsPanel.tsx`：新增 Menu 按鈕與可收合結果清單，顯示名稱、評分及地址，支援獨立捲動。
- `components/MapContainer/MapContainer.tsx`：桌面改成左側結果面板、右側地圖，手機面板可收合；中心點採大尺寸酸橙綠 LocationOn，餐廳採深色 LocationOn，保留拖曳、範圍圓與單一資訊視窗。
- `components/MapContainer/config.ts`：新增公開 Map ID 設定及示範值，說明 Cloud 樣式與底圖商家的關係。
- `domain/places/nearby.ts`：使用 Places API (New) 搜尋半徑 3000 公尺內最多 20 間餐廳，整理欄位、排除重複與無效座標，加入短期快取及逾時處理。
- `domain/places/useNearbyRestaurants.ts`：中心改變時重新搜尋，管理結果、載入、錯誤與重試，避免舊請求覆蓋新資料。
- `domain/places/store.ts`：保留舊版 1 公里搜尋及隨機選餐廳，補上與新版流程的差異說明；Restaurant 型別仍共用。

### 設定、文件與驗證

- `next.config.ts`：整理部署路徑，未填 repository 名稱時使用根路徑，保留靜態匯出。
- `package.json`、`package-lock.json`：新增 @mui/icons-material 9.4.0，保留其他套件版本；JSON 不支援註解，改在文件說明。
- `tests/state.test.mjs`：補充金鑰保存、還原、清除、座標驗證、定位、3 公里搜尋、快取與錯誤遮蔽的測試。
- `CODE_GUIDE.md`：新增中文檔案閱讀順序、常見語法與本次套件說明。
- `MAP_STYLE_SETUP.md`：記錄 Map ID、Cloud 樣式與底圖 POI 設定及測試方式。
- `CHANGELOG.md`：逐檔記錄這次變更，方便檢視提交內容。

驗證：TypeScript、ESLint、13 項自動化測試及 Webpack 正式建置通過。未重新完成真實 Google API 與瀏覽器視覺驗收。
