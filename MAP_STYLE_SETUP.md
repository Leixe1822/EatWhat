# EatWhat 地圖樣式設定

## 三種設定不可混為一談

- `disableDefaultUI`、`mapTypeControl: false`、`streetViewControl: false`：隱藏控制按鈕；`zoomControl` 仍保留。
- `clickableIcons: false`：禁止點擊底圖 POI，**不會隱藏圖示**。
- Map ID 綁定的 Cloud 地圖樣式：真正控制底圖 POI 圖示、標籤的可見性。

## Google Cloud 操作

1. 在同一 Google Cloud 專案啟用 Maps JavaScript API、Places API (New) 與帳單，金鑰設定 HTTP referrer 與必要 API 限制。
2. 在 Google Maps Platform 建立 JavaScript Map ID，選擇向量地圖。
3. 建立 Cloud 地圖樣式，在 Points of interest 類別關閉商家類別的圖示與標籤；若需只保留自己的所有 POI，可關閉整個 Points of interest 類別。保留道路、地名等導航資訊。
4. 儲存並發布樣式，將樣式綁定到上述 Map ID。只存草稿不會影響網站。
5. 在專案 `.env.local` 設定 `NEXT_PUBLIC_GOOGLE_MAP_ID=你的MapID`，重新啟動 dev；正式部署需重新 build。

Map ID 是公開設定，不是 API Key。不要把使用者的 API Key 寫入環境檔。
未設定時使用 DEMO_MAP_ID，能展示 AdvancedMarker，但不保證隱藏底圖 POI。
本專案不把舊版 `styles` 陣列與 Map ID 混用；有自訂 Map ID 也不代表 Cloud 樣式已正確發布，需實際查看。

## 驗收

- 設定有效金鑰，從首頁選擇位置；確認圓圈為 3000 公尺、結果最多 20 筆。
- 逐一點標記；切換餐廳時只有一個資訊窗，關閉後標記數量不變。
- 拖曳或縮放不應發送新搜尋；不同 URL 中心應更新圓圈與結果。
- 測試未啟用 Places API、網路失敗、空結果、重新整理與非法座標。
- 在手機確認資訊窗可見、工具列不覆蓋地圖；驗證底圖商家圖示及標籤是否真的消失。
- 請求共用與 60 秒短期記憶體快取只用於去重，不保證包含範圍內全部餐廳。

參考：
- https://developers.google.com/maps/documentation/javascript/nearby-search
- https://developers.google.com/maps/documentation/javascript/cloud-customization/map-styles
