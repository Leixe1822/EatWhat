// 共用的預設地圖視角，供地圖初始化與 store 的移動操作使用。
export const DEFAULT_CAMERA = {
  // lat 為緯度、lng 為經度。
  center: { lat: 25.033964, lng: 121.564468 },
  zoom: 16, // 縮放層級，數值越大通常顯示越細的區域。
  // as const 在型別層保留字面值並標記唯讀，不會在執行期凍結物件。
} as const
