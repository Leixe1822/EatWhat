import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// 使用 ESLint flat config，整合 Next.js 與 TypeScript 的程式碼檢查規則。
const eslintConfig = defineConfig([
  // Next.js 與 Core Web Vitals 相關規則。
  ...nextVitals,
  // TypeScript 專用規則。
  ...nextTs,
  // 明確列出不需檢查的建置產物與自動產生的型別檔案。
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
