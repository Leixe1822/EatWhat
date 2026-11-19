// 舊版地圖共用預設值；目前結果頁從 URL 讀取中心，並依搜尋距離計算鏡頭。
// 保留台北 101 座標作為設定資料。lat 是緯度，lng 是經度。
export const DEFAULT_CAMERA = {
  center: { lat: 25.033964, lng: 121.564468 },
  zoom: 0.01, // 數字越小範圍越廣，此值供舊版 updateCenter 使用。
}
