import { DEFAULT_CAMERA } from '@/domain/map/config'
import type { MapCameraProps, MapEvent } from '@vis.gl/react-google-maps'
import { create } from 'zustand'

// 保存目前的地圖和中心座標。
export type MapStore = {
  // 有了地圖物件，才能移動地圖或調整縮放。
  map: MapEvent['map'] | null
  // 拖曳地圖或選擇餐廳時會更新。
  center: MapCameraProps['center'] | null
}

// 地圖資料不用存到瀏覽器，重新整理後會重設。
const useMapStore = create<MapStore>(() => ({
  map: null,
  center: null,
}))

export default useMapStore

// 地圖載入時保存，離開畫面時傳入 null。
function setMap(map: MapEvent['map'] | null) {
  useMapStore.setState({ map })
}

// 選擇餐廳後，把地圖移到餐廳的位置。
function updateCenter(center: MapCameraProps['center'] | null) {
  useMapStore.setState({ center })
  if (!center) {
    return
  }
  // 讀取目前的地圖。
  const map = useMapStore.getState().map
  if (!map) {
    return
  }
  // 將地圖移至指定座標，並套用共用的預設縮放層級。
  map.panTo(center)
  if (DEFAULT_CAMERA.zoom) map.setZoom(DEFAULT_CAMERA.zoom)
}

// 只清空記錄的座標，不會將地圖畫面移回預設位置。
function resetCenter() {
  useMapStore.setState({ center: null })
}

// 清空保存的地圖和座標。
function resetMapStore() {
  useMapStore.setState({ map: null, center: null })
}

export { setMap, updateCenter, resetCenter, resetMapStore }
