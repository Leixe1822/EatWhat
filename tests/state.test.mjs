// 使用假的儲存空間、定位和 Google 資料，不會發出真正的 API 請求。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
const externalRequire = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cache = new Map()
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const mod = { exports: {} }
  cache.set(filename, mod)
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  // 測試直接在 Node.js 執行，所以需要先轉換 TypeScript 和 @/ 路徑。
  function requireModule(name) {
    if (name.startsWith('@/')) {
      return load(name.slice(2) + '.ts')
    }
    return externalRequire(name)
  }
  const runModule = new Function('require', 'module', 'exports', js)
  runModule(requireModule, mod, mod.exports)
  return mod.exports
}
const key = load('domain/key/store.ts')
const places = load('domain/places/store.ts')
const map = load('domain/map/store.ts')
const fakeKey = 'AIza' + 'x'.repeat(35)

test('金鑰：檢查格式、讀取舊資料、儲存和清除', () => {
  let stored = JSON.stringify({ state: { key: fakeKey, loading: true } })
  global.localStorage = {
    getItem: () => stored,
    setItem: (_, value) => {
      stored = value
    },
    removeItem: () => {
      stored = null
    },
  }
  assert.equal(key.isKeyFormatValid('invalid'), false)
  assert.equal(key.isKeyFormatValid(' ' + fakeKey + ' '), true)
  key.hydrateKey()
  assert.equal(key.default.getState().loading, false)
  assert.equal(key.default.getState().key, fakeKey)
  assert.equal(key.setKey(' ' + fakeKey + ' '), true)
  assert.deepEqual(JSON.parse(stored).state, { key: fakeKey })
  assert.equal(key.clearKey(), true)
  assert.equal(stored, null)
  assert.equal(key.default.getState().key, null)
})
test('儲存資料損壞或無法使用時，結束載入並顯示錯誤', () => {
  key.default.setState({ loading: true })
  global.localStorage = {
    getItem: () => '{broken',
    setItem: () => {
      throw new Error()
    },
    removeItem: () => {
      throw new Error()
    },
  }
  key.hydrateKey()
  assert.equal(key.default.getState().loading, false)
  assert.ok(key.default.getState().storageError)
  assert.equal(key.setKey(fakeKey), false)
  assert.equal(key.clearKey(), false)
})
test('搜尋地址、避免重複搜尋，並選擇餐廳', async () => {
  let resolveSearch
  let calls = 0
  global.google = {
    maps: {
      importLibrary: async () => ({
        Place: {
          searchByText: async () => ({
            places: [{ location: { toJSON: () => ({ lat: 25, lng: 121 }) } }],
          }),
          searchNearby: () => {
            calls++
            return new Promise((resolve) => {
              resolveSearch = resolve
            })
          },
        },
      }),
    },
  }
  places.setQuery('台北 101')
  const request = places.searchRestaurants()
  await new Promise((resolve) => setImmediate(resolve))
  await places.searchRestaurants()
  assert.equal(calls, 1)
  resolveSearch({
    places: [
      {
        id: 'one',
        displayName: '測試餐廳',
        location: { toJSON: () => ({ lat: 25, lng: 121 }) },
      },
    ],
  })
  await request
  assert.equal(places.default.getState().status, 'success')
  assert.equal(places.default.getState().restaurants.length, 1)
  places.pickRestaurant()
  assert.equal(places.default.getState().selectedId, 'one')
  assert.deepEqual(map.default.getState().center, { lat: 25, lng: 121 })
})
test('處理空白地址、沒有餐廳、API 錯誤和拒絕定位', async () => {
  places.setQuery(' ')
  await places.searchRestaurants()
  assert.equal(places.default.getState().error, '請輸入地址或地標。')
  places.setQuery('test')
  global.google.maps.importLibrary = async () => ({
    Place: {
      searchByText: async () => ({
        places: [{ location: { toJSON: () => ({ lat: 25, lng: 121 }) } }],
      }),
      searchNearby: async () => ({ places: [] }),
    },
  })
  await places.searchRestaurants()
  assert.equal(places.default.getState().status, 'success')
  assert.deepEqual(places.default.getState().restaurants, [])
  global.google.maps.importLibrary = async () => {
    throw new Error('private provider detail')
  }
  await places.searchRestaurants()
  assert.equal(places.default.getState().status, 'error')
  assert.doesNotMatch(places.default.getState().error, /private/)
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
      geolocation: { getCurrentPosition: (_, reject) => reject({ code: 1 }) },
    },
  })
  await places.searchRestaurants(true)
  assert.match(places.default.getState().error, /定位權限遭拒/)
})
