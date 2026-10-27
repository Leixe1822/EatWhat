import type { NextConfig } from 'next'

// 正式建置才套用部署路徑，開發環境維持根路徑。
const isProd = process.env.NODE_ENV === 'production'
// TODO：依 GitHub Pages 的部署位置填入 repository 名稱。
const PROJECT_NAME = ''
// 尚未指定 repository 時部署於根路徑，避免產生不合法的 basePath「/」。
const deploymentPath = isProd && PROJECT_NAME ? `/${PROJECT_NAME}` : ''

const nextConfig: NextConfig = {
  // 啟用 React Compiler，讓編譯器協助最佳化 React 元件。

  reactCompiler: true,

  // next build 產生 out/ 靜態檔案，供 GitHub Pages 等靜態主機提供服務。

  output: 'export',
  // 網站路由前綴，例如 /dine-pick。

  basePath: deploymentPath,
  // Next.js 靜態資源的 URL 前綴。

  assetPrefix: deploymentPath ? `${deploymentPath}/` : '',

  images: {
    // 靜態部署不提供 Next.js 伺服器端的圖片最佳化服務。
    unoptimized: true,
  },
}

export default nextConfig
