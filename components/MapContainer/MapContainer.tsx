'use client'

import { Box } from '@mui/material'
import { Map } from '@vis.gl/react-google-maps'
import { DEFAULT_CAMERA } from './config'

// 地圖展示元件，須放在 APIProvider 內；目前尚未串接 domain/map 的 store。
const MapContainer: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: 'stretch', // 讓容器高度延展至父層可用空間。
      bgcolor: 'grey.50',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {/* defaultCenter/defaultZoom 只提供初始視角，後續仍可由使用者操作。 */}
    <Map
      // 示範 Map ID 用於地圖設定，與載入 API 所需的 API Key 不同。
      mapId='DEMO_MAP_ID'
      defaultCenter={DEFAULT_CAMERA.center}
      defaultZoom={DEFAULT_CAMERA.zoom}
      // 讓地圖接收滾輪與觸控手勢，而不要求搭配修飾鍵操作。
      gestureHandling='greedy'
      // 隱藏預設控制介面，例如縮放按鈕。
      disableDefaultUI
      // 啟用地圖實例快取，允許符合條件的後續掛載重用實例。
      reuseMaps
    >
      {/* 未來可在此加入餐廳標記或資訊視窗；目前只顯示底圖。 */}
    </Map>
  </Box>
)

export default MapContainer
