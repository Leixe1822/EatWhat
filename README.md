# Dine Pick 🍽️

以「指定地點」或「目前位置」作為中心點，串接 **Google Places API** 取得附近餐廳推薦，篩選後標記在地圖上並以清單呈現，最後可透過隨機推薦功能，幫你決定待會要吃什麼。

本專案同時是一份 **教學用範例專案**：目標是提供一份具備清楚分層、可延伸的專案骨架，讓學生在既有結構上繼續實作功能，於實作中學習 Next.js App Router、MUI、Zustand 與 Google Maps API 的整合方式。

> 📘 若你是要在本專案基礎上繼續開發的學生，請先閱讀 [Tutorial.md](./Tutorial.md)，裡面說明了架構規劃、套件使用重點與開發注意事項。

## 功能特色

- 以指定地點或目前定位為中心，搜尋附近餐廳
- 篩選搜尋結果並於地圖上標記
- 以清單方式顯示候選餐廳
- 隨機推薦功能，協助決定用餐地點

## 技術棧

| 分類       | 使用技術                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------ |
| 框架       | [Next.js](https://nextjs.org)（App Router）                                                |
| UI 元件庫  | [MUI](https://mui.com/material-ui/)                                                        |
| 狀態管理   | [Zustand](https://zustand.docs.pmnd.rs/)                                                   |
| 地圖 / API | [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/)、Google Places API |
| 其他工具   | [use-debounce](https://www.npmjs.com/package/use-debounce)                                 |
| 部署方式   | 靜態輸出（`next export`），部署於 GitHub Pages                                             |

## 開始使用

### 環境需求

- Node.js 20 以上
- 一組具備 Places API 及 Maps JavaScript API 權限的 Google Maps API Key

### 安裝依賴

```bash
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)，畫面上會提示輸入 Google Maps API Key，輸入後即可載入地圖並開始使用。

### 建置靜態檔案

本專案設定為 `output: 'export'`，建置後會於 `out/` 目錄產出靜態檔案，可直接部署於 GitHub Pages 等靜態主機。

```bash
npm run build
```

### 程式碼檢查

```bash
npm run lint
```

## 專案結構

```
app/          # App Router 路由與頁面
components/   # 可重用的視覺組件
domain/       # 業務領域邏輯（schema / store / api / hook）
shells/       # 外層 Provider、Layout 等殼層元件
styles/       # 主題與樣式設定
public/       # 靜態資源
```

各資料夾的規劃細節與延伸開發指引請參考 [Tutorial.md](./Tutorial.md)。

## 部署

本專案預期部署於 **GitHub Pages**，建置後的靜態檔案輸出於 `out/` 目錄，`next.config.ts` 中已設定 `basePath` / `assetPrefix`，部署前請確認 `PROJECT_NAME` 已填入對應的 GitHub Pages repository 名稱。

## License

本專案僅供教學使用。
