'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

const APIProviderShell: typeof APIProvider = props => {
  return <APIProvider {...props} />
}

export default APIProviderShell
