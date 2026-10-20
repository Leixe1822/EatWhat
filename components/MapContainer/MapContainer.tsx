'use client'
import { useEffect } from 'react'
import { Box } from '@mui/material'
import { AdvancedMarker, Map, Pin, useMap } from '@vis.gl/react-google-maps'
import useMapStore, { setMap } from '@/domain/map/store'
import usePlacesStore, { selectRestaurant } from '@/domain/places/store'
import { DEFAULT_CAMERA } from './config'

function MapBinding() {
  const map = useMap()
  useEffect(() => {
    setMap(map)
    const center = useMapStore.getState().center
    if (map && center) {
      map.panTo(center)
    }
    // 元件離開畫面時，清掉保存的地圖。
    return () => {
      setMap(null)
    }
  }, [map])
  return null
}
export default function MapContainer() {
  const restaurants = usePlacesStore((state) => state.restaurants)
  const selectedId = usePlacesStore((state) => state.selectedId)
  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 360, md: 520 },
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={DEFAULT_CAMERA.center}
        defaultZoom={DEFAULT_CAMERA.zoom}
        gestureHandling="cooperative"
        onCameraChanged={(e) =>
          useMapStore.setState({ center: e.detail.center })
        }
      >
        <MapBinding />
        {restaurants.map((restaurant) => (
          <AdvancedMarker
            key={restaurant.id}
            position={restaurant.location}
            title={restaurant.name}
            onClick={() => selectRestaurant(restaurant.id)}
          >
            <Pin
              background={restaurant.id === selectedId ? '#58748f' : '#d0d5db'}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </Box>
  )
}
