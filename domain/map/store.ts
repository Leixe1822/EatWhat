import { DEFAULT_CAMERA } from '@/components/MapContainer'
import type { MapCameraProps, MapEvent } from '@vis.gl/react-google-maps'
import { create } from 'zustand'

export type MapStore = {
  map: MapEvent['map'] | null
  center: MapCameraProps['center'] | null
}

const useMapStore = create<MapStore>(() => ({
  map: null,
  center: null,
}))

export default useMapStore

const setMap = (map: MapEvent['map'] | null) => {
  useMapStore.setState({ map })
}

const updateCenter = (center: MapCameraProps['center'] | null) => {
  useMapStore.setState({ center })
  if (!center) return
  const map = useMapStore.getState().map
  if (!map) return
  map.panTo(center)
  if (DEFAULT_CAMERA.zoom) map.setZoom(DEFAULT_CAMERA.zoom)
}

const resetCenter = () => {
  useMapStore.setState({ center: null })
}

const resetMapStore = () => {
  useMapStore.setState({ map: null, center: null })
}

export { setMap, updateCenter, resetCenter, resetMapStore }
