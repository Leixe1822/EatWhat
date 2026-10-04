import { DEFAULT_CAMERA } from '@/components/MapContainer'
import type { MapCameraProps, MapEvent } from '@vis.gl/react-google-maps'
import { create } from 'zustand'

// 地圖控制所需的狀態；目前畫面尚未呼叫 setMap 註冊地圖實例。
export type MapStore = {
  // 取用套件事件中的 map 型別，保存可呼叫 panTo/setZoom 的地圖實例。
  map: MapEvent['map'] | null
  // 程式記錄的目標中心點，不會自行與使用者拖曳後的位置同步。
  center: MapCameraProps['center'] | null
}

// 地圖實例只保存在記憶體中，不使用 localStorage 持久化。
const useMapStore = create<MapStore>(() => ({
  map: null,
  center: null,
}))

export default useMapStore

// 註冊地圖實例；也可傳入 null 清除參照。
const setMap = (map: MapEvent['map'] | null) => {
  useMapStore.setState({ map })
}

// 先記錄座標；只有同時存在座標與地圖實例時才操作畫面。
const updateCenter = (center: MapCameraProps['center'] | null) => {
  useMapStore.setState({ center })
  if (!center) return
  // getState 可在一般函式中讀取最新狀態，不需要使用 React hook。
  const map = useMapStore.getState().map
  if (!map) return
  // 將地圖移至指定座標，並套用共用的預設縮放層級。
  map.panTo(center)
  if (DEFAULT_CAMERA.zoom) map.setZoom(DEFAULT_CAMERA.zoom)
}

// 只清空記錄的座標，不會將地圖畫面移回預設位置。
const resetCenter = () => {
  useMapStore.setState({ center: null })
}

// 清除 store 內的參照與座標，不負責銷毀地圖實例。
const resetMapStore = () => {
  useMapStore.setState({ map: null, center: null })
}

export { setMap, updateCenter, resetCenter, resetMapStore }
