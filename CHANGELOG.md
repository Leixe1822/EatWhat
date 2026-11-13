# EatWhat 變更紀錄

## 2026-11-13：首頁美食插畫與手機版地圖探索

### 首頁
- 新增獨立 SVG 美食地圖插畫，包含餐具、拉麵、漢堡及咖啡圖釘、道路與探索虛線。
- 圖釘以不同延遲緩慢浮動，支援減少動態效果設定；手機版隱藏插畫。
- 主內容在頁首下方置中，減少多餘留白；手機標題與說明置中。

### 手機餐廳結果頁
- 以 768px 為斷點，新增底部面板，預設半開；支援約 15%／50%／90% 高度、拖曳吸附與鍵盤操作。
- 安全區與軟鍵盤可視高度納入排版，保留頂部搜尋及 Google 版權顯示空間。
- 新增浮動地址搜尋、返回、清除及目前位置按鈕，沿用原有搜尋邏輯；搜尋欄聚焦時外框不變。
- 篩選條件橫向捲動，餐廳清單獨立捲動；缺少的餐廳資料不補造。
- 點選卡片收合面板並定位標記；點選標記半開面板並定位清單卡片。
- 加回手機餐廳資訊卡，限制寬高並允許內容捲動；面板完全展開時暫時隱藏。
- 調整面板高度不重新建立地圖或觸發附近搜尋，桌面維持側欄與地圖配置。

驗證：Webpack 正式建置及靜態匯出、TypeScript、全專案 ESLint、23 項測試通過。

驗證限制：瀏覽器工具無可用連線，尚未完成 375／390／430px 真實畫面及 Google Maps 手勢驗收。

## 2026-11-13：餐廳分類、距離查詢與營業狀態更新

### 搜尋與資料處理

- 切換 0.5／1／2／3 公里時重新查詢 Google，查詢半徑、清單及地圖範圍圈同步；保留 Google 預設排序。
- 查詢端與資料整理端排除飯店、婚宴類型，並以明確婚宴名稱補判。
- 首輪回傳 20 筆但排除後不足時，最多補查三批不同餐廳類型，依 ID 去重、維持半徑，滿 20 間即停止；補查失敗保留已有結果。
- 新增 `openingHours.ts`，以 `currentOpeningHours` 與店家時區判斷多段、跨日及全天營業；缺資料保留未知。狀態於查詢時計算，尚未定時更新。
- 料理選單改為指定的 14 個選項（含全部類型），顯示本次結果數量，零筆停用；無法歸類的資料放入其他。
- 價格選單移除 $$$$，保留原始價格資料。

### 結果面板與地圖

- 篩選與隨機按鈕固定於面板上方，只捲動下方餐廳清單；選中餐廳以 scrollIntoView 定位。
- 選中的地圖標記改為深橘色配米白描邊。
- 移除資訊視窗外層白底、箭頭及「餐廳資訊」標題，關閉按鈕移入卡片。
- 隨機按鈕 hover 改為向下按壓；重新選擇按鈕尺寸與下拉選單一致。
- 隨機抽選保留目前半徑，只重設其他篩選條件。

### 可讀性與測試

- 補充中文流程與邊界註解，修正過時說明，拆解營業判斷及顯示文字的密集條件；更新 CODE_GUIDE.md。
- 測試擴充至 23 項，涵蓋料理分組、婚宴排除、半徑重查、補查去重及營業時段判斷。

驗證：Webpack 正式建置與靜態匯出（out/）、TypeScript、全專案 ESLint、23 項測試及差異空白檢查通過。預設 Turbopack 建置無進一步輸出後停止，改以 Webpack 完成；未執行真實 Google API 瀏覽器驗收。

## 2026-11-06：餐廳篩選、隨機選擇與地圖資訊卡

### 地圖與結果清單

- 將清單收合按鈕移入地圖：展開時位於左側中央，收合時位於左上角，地圖填滿空出的寬度。
- 地圖與結果面板共用高度；桌面填滿剩餘畫面，長清單在框內捲動，減少下方留白。
- 移除地圖上方的搜尋半徑與結果數量標籤列，保留清單結果筆數。
- 加入距離、美食類型、價格、評分、營業狀態下拉選單及「重新選擇」，同步篩選清單、筆數和地圖標記。
- 下拉選單不使用浮動標籤，空值顯示全部選項；價格選單排除「免費」。最終結果頁不顯示搜尋框。
- 加入「隨機選一家」：從本次完整結果（最多 20 間）等機率抽選，重設篩選並開啟餐廳資訊視窗；無資料時停用，不新增 API 請求。

### 餐廳資料與資訊視窗

- 附近查詢半徑改為 3 公里；距離篩選預設及範圍圈同步，較小距離只在本地篩選。
- 增加類型、價格、營業時間、時區與評分人數欄位，缺少價格或營業狀態時保留未知。
- 資訊視窗改為白底、深色圓角邊框與硬陰影；評分和營業狀態並排，新增 Google Maps 開啟連結。
- 資訊視窗最終不顯示直線距離及評分人數；資料層仍保留評分人數。
- 保留 Logo、返回鍵、點選餐廳及拖曳搜尋中心行為，補充中文程式註解。

### 共用邏輯與驗證

- 新增 `domain/places/filters.ts`，集中距離計算、預設條件及本地篩選。
- `useLocationSearch` 支援查詢成功回呼；保留 `LocationSearch.tsx` 地點搜尋元件，目前未掛載於結果頁。
- 更新 3 公里查詢測試，新增組合篩選及未知資料測試。
- TypeScript、全專案 ESLint、15 項現有測試與 Git 差異空白檢查通過；未執行正式建置或真實 Google API 瀏覽器驗收。
- 已知限制：營業狀態仍依賴可用的 `isOpen()`；方法不可用或資料不足時顯示未知，本次尚未改為自行計算營業時段。

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
