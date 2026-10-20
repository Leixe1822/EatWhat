# 功能實作筆記

## 畫面放在哪裡

- `app/page.tsx`：首頁入口，載入 `LandingPage`。
- `components/LandingPage/LandingPage.tsx`：搜尋表單、餐廳清單和設定視窗。
- `components/KeySettings/KeySettings.tsx`：輸入、顯示、儲存和清除金鑰。
- `components/MapContainer/MapContainer.tsx`：地圖和餐廳標記。

## 使用流程

1. 第一次開啟網站時，先輸入 Google Maps API Key。
2. 金鑰儲存在這個瀏覽器，重新整理後會自動讀取。
3. 輸入地址或使用目前位置，搜尋附近一公里內最多二十間餐廳。
4. 點選餐廳卡片或地圖標記，地圖會移到餐廳的位置。
5. 不知道吃什麼時，可以按「幫我選一間」隨機選擇。

儲存、更換或清除金鑰後會重新載入頁面，讓 Google Maps 使用新的設定。金鑰格式正確不代表可以使用，還需要啟用 Maps JavaScript API、Places API (New) 和帳單，並設定網站來源限制。

## 資料怎麼管理

使用 Zustand 保存資料，畫面讀取資料後顯示內容：

- `domain/key/store.ts`：金鑰、載入狀態和儲存錯誤。
- `domain/places/store.ts`：搜尋文字、搜尋結果、選中的餐廳和錯誤訊息。
- `domain/map/store.ts`：目前的地圖和中心座標。
- `domain/map/config.ts`：預設位置是台北 101，縮放層級是 16。

搜尋時會停用按鈕，也會在搜尋函式內檢查是否正在搜尋，避免重複呼叫 API。拖曳地圖只更新位置，不會自動再次搜尋。

## 程式寫法

表單操作放在 `handleSubmit`、`handleSearch` 等函式，方便從按鈕找到對應程式。餐廳資料使用 `for...of` 逐筆整理，畫面則使用 `.map()` 顯示每間餐廳。JSX 分行排列，重要流程補上中文註解。

## 如何檢查

```bash
npm run lint
npx tsc --noEmit
node --test tests/state.test.mjs
```

自動測試使用假的 Google 資料、定位和瀏覽器儲存空間，檢查正常流程與錯誤處理，不會產生 Google API 費用。

實際地圖和定位仍需要用有效金鑰在瀏覽器確認，也要檢查手機版面、點選餐廳、拒絕定位和更換金鑰的操作。
