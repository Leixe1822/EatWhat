export { DEFAULT_CAMERA } from '@/domain/map/config'
// Map ID 不是 API Key，可公開；必須綁定已發布的 Cloud 地圖樣式才能隱藏 POI。
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim() || 'DEMO_MAP_ID'
// 只判斷是否有自訂 ID；底圖商家是否隱藏，仍由 Cloud 樣式決定。
export const HAS_CUSTOM_MAP_ID = MAP_ID !== 'DEMO_MAP_ID'
