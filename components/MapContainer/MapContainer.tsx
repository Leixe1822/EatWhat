'use client'

import { Box } from '@mui/material'
import { Map } from '@vis.gl/react-google-maps'
import { DEFAULT_CAMERA } from './config'

const MapContainer: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      height: 'stretch',
      bgcolor: 'grey.50',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Map
      mapId='DEMO_MAP_ID'
      defaultCenter={DEFAULT_CAMERA.center}
      defaultZoom={DEFAULT_CAMERA.zoom}
      gestureHandling='greedy'
      disableDefaultUI
      reuseMaps
    >
      {/* Markers can be added here */}
    </Map>
  </Box>
)

export default MapContainer
