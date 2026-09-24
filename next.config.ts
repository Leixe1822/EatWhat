import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'
// TODO: Set the project name for the application
const PROJECT_NAME = ''

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Setting up GitHub Pages
  output: 'export',
  basePath: isProd ? `/${PROJECT_NAME}` : '',
  assetPrefix: isProd ? `/${PROJECT_NAME}/` : '',
  images: {
    unoptimized: true,
  },
}

export default nextConfig
