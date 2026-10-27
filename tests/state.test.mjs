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
// 測試載入器：將 TypeScript 轉為 Node 可執行的 CommonJS，不需要額外測試套件。
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative)
  if (cache.has(filename)) {
    return cache.get(filename).exports
  }
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
// 只有測試用字串，不是真正的 Google 金鑰。
const fakeKey = 'AIza' + 'x'.repeat(35)

test('persist 只保存 key，hydration 重新驗證且不能同頁換 key', () => {
  let saved = null
  global.localStorage = {
    getItem: () => saved,
    setItem: (_name, value) => {
      saved = value
    },
    removeItem: () => {
      saved = null
    },
  }
  assert.equal(key.setKey(fakeKey), false)
  key.hydrateKey()
  assert.equal(key.default.getState().hydrated, true)
  assert.equal(key.setKey('  '), false)
  assert.equal(key.setKey(' ' + fakeKey + ' '), true)
  assert.deepEqual(JSON.parse(saved).state, { key: fakeKey })
  assert.equal(key.default.getState().loading, true)
  assert.equal(key.setKey('another-key'), false)
  key.markMapsReady()
  assert.equal(key.default.getState().ready, true)
  key.default.persist.rehydrate()
  assert.equal(key.default.getState().key, fakeKey)
  assert.equal(key.default.getState().loading, true)
  assert.equal(key.default.getState().ready, false)
})
test('晚到的授權失敗會鎖回遮罩，後續 onLoad 不得清掉錯誤', () => {
  key.failMaps('授權失敗')
  assert.equal(key.default.getState().ready, false)
  assert.equal(key.default.getState().loading, false)
  key.markMapsReady()
  assert.equal(key.default.getState().ready, false)
  assert.equal(key.default.getState().error, '授權失敗')
  assert.equal(key.setKey('retry-key'), false)
})
test('儲存被封鎖仍可使用本次金鑰，並顯示警告', async () => {
  global.localStorage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  }
  key.default.setState({ key: null, loading: false, ready: false, error: null, hydrated: false })
  key.hydrateKey()
  await Promise.resolve()
  assert.equal(key.default.getState().hydrated, true)
  assert.ok(key.default.getState().storageError)
  assert.equal(key.setKey('not-a-valid-google-key'), true)
  key.failMaps('逾時')
  key.markMapsReady()
  assert.equal(key.default.getState().ready, false)
  key.clearSavedKey()
  assert.match(key.default.getState().storageError, /無法清除/)
  await Promise.resolve()
})
test('清除已保存金鑰後重新載入，晚到 callback 不會重新保存', () => {
  let saved = fakeKey
  let reloaded = false
  global.localStorage = {
    removeItem: () => {
      saved = null
    },
    setItem: () => {
      saved = 'unexpected'
    }
  }
  global.window = {
    location: {
      reload: () => {
        reloaded = true
      }
    }
  }
  key.clearSavedKey()
  key.failMaps('late')
  assert.equal(saved, null)
  assert.equal(reloaded, true)
})
test('更新搜尋中心不會移動地圖或重設縮放', () => {
  map.setMap({ panTo: () => assert.fail('不能平移'), setZoom: () => assert.fail('不能重設縮放') })
  map.setSearchCenter({ lat: 25, lng: 121 })
  assert.deepEqual(map.default.getState().center, { lat: 25, lng: 121 })
  map.setMap(null)
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

test('URL 座標：正常、零值、邊界、缺漏與惡意輸入', () => {
  const { parseCenter } = load('domain/map/location.ts')
  assert.deepEqual(parseCenter(new URLSearchParams('lat=25.03&lng=121.56')), { lat: 25.03, lng: 121.56 })
  assert.deepEqual(parseCenter(new URLSearchParams('lat=0&lng=0')), { lat: 0, lng: 0 })
  assert.deepEqual(parseCenter(new URLSearchParams('lat=-90&lng=180')), { lat: -90, lng: 180 })
  for (const query of ['', 'lat=&lng=0', 'lat=91&lng=0', 'lat=0&lng=-181', 'lat=NaN&lng=0', 'lat=Infinity&lng=0', 'lat=0x10&lng=0', 'lat=0&lat=1&lng=0', 'lat=%20&lng=0']) {
    assert.equal(parseCenter(new URLSearchParams(query)), null, query)
  }
})
test('定位：成功、拒絕、位置不可用、逾時與不支援', async () => {
  const { getCurrentCenter } = load('domain/map/location.ts')
  const setNavigator = value => Object.defineProperty(global, 'navigator', { configurable: true, value })
  setNavigator({
    geolocation: { getCurrentPosition: resolve => resolve({ coords: { latitude: 25, longitude: 121 } }) }
  })
  assert.deepEqual(await getCurrentCenter(), { lat: 25, lng: 121 })
  for (const [code, message] of [[1, /權限遭拒/], [2, /無法取得/], [3, /逾時/]]) {
    setNavigator({ geolocation: { getCurrentPosition: (_, reject) => reject({ code }) } })
    await assert.rejects(getCurrentCenter(), message)
  }
  setNavigator({})
  await assert.rejects(getCurrentCenter(), /不支援/)
})

test('Nearby 使用 3 公里與 20 筆限制，共用請求並整理有效餐廳', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  let calls = 0
  let resolve
  const library = {
    Place: {
      searchNearby: options => {
        calls++
        assert.equal(options.locationRestriction.radius, 3000)
        assert.equal(options.maxResultCount, 20)
        assert.deepEqual(options.includedTypes, ['restaurant'])
        return new Promise(done => {
          resolve = done
        })
      }
    }
  }
  const first = fetchNearby(library, { lat: 24, lng: 120 })
  const second = fetchNearby(library, { lat: 24, lng: 120 })
  assert.equal(first, second)
  await Promise.resolve()
  assert.equal(calls, 1)
  resolve({
    places: [
      {
        id: 'one',
        displayName: '餐廳',
        rating: 0,
        location: { toJSON: () => ({ lat: 24, lng: 120 }) }
      },
      { id: 'missing' },
      { id: 'bad', location: { toJSON: () => ({ lat: 100, lng: 120 }) } },
      { id: 'one', location: { toJSON: () => ({ lat: 24, lng: 120 }) } },
    ]
  })
  const result = await first
  assert.equal(result.length, 1)
  assert.equal(result[0].rating, 0)
  assert.equal(result[0].address, '未提供地址')
  await fetchNearby(library, { lat: 24, lng: 120 })
  assert.equal(calls, 1)
})
test('Nearby 失敗可重試，空結果正常，不同座標請求互不覆蓋', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  let count = 0
  const library = {
    Place: {
      searchNearby: async () => {
        if (++count === 1) {
          throw new Error('denied')
        }
        return { places: [] }
      }
    }
  }
  await assert.rejects(fetchNearby(library, { lat: 23, lng: 120 }))
  assert.deepEqual(await fetchNearby(library, { lat: 23, lng: 120 }), [])
  assert.equal(count, 2)
  await assert.rejects(fetchNearby(library, { lat: 91, lng: 0 }))
  const resolvers = new Map()
  const delayed = {
    Place: {
      searchNearby: options => new Promise(resolve => resolvers.set(options.locationRestriction.center.lat, resolve))
    }
  }
  const a = fetchNearby(delayed, { lat: 20, lng: 120 })
  const b = fetchNearby(delayed, { lat: 21, lng: 120 })
  await Promise.resolve()
  resolvers.get(21)({ places: [] })
  assert.deepEqual(await b, [])
  resolvers.get(20)({ places: [{ id: 'a', location: { toJSON: () => ({ lat: 20, lng: 120 }) } }] })
  assert.equal((await a)[0].id, 'a')
})

const searchError = load('domain/map/searchError.ts')
test('地址錯誤辨識 code、status 和 Error 訊息，不直接顯示原始文字', () => {
  for (const cause of [{ code: 'REQUEST_DENIED' }, { status: 'REQUEST_DENIED' }, new Error('Geocoding: REQUEST_DENIED: rejected')]) {
    assert.equal(searchError.describeSearchError(cause, null).diagnostic.code, 'REQUEST_DENIED')
    assert.match(searchError.describeSearchError(cause, null).message, /Geocoding API/)
  }
  for (const code of ['ZERO_RESULTS', 'OVER_QUERY_LIMIT', 'OVER_DAILY_LIMIT', 'INVALID_REQUEST', 'UNKNOWN_ERROR', 'ERROR']) {
    assert.equal(searchError.describeSearchError(code, null).diagnostic.code, code)
  }
  const failure = searchError.describeSearchError(new Error('private details'), null)
  assert.equal(failure.diagnostic.message, 'private details')
  assert.ok(!failure.message.includes('private details'))
  assert.equal(searchError.describeSearchError(new Error('定位權限遭拒，請允許定位或改用地址搜尋。'), null, true).message, '定位權限遭拒，請允許定位或改用地址搜尋。')
})
test('診斷訊息遮蔽金鑰和 URL，不包含原始 Error 物件', () => {
  const secret = 'test/key+secret'
  const cause = new Error(`REQUEST_DENIED ${secret} ${encodeURIComponent(secret)} ${fakeKey} https://example.com/?key=hidden key=another-secret`)
  const failure = searchError.describeSearchError(cause, secret)
  const output = JSON.stringify(failure)
  for (const value of [secret, encodeURIComponent(secret), fakeKey, 'hidden', 'another-secret']) assert.ok(!output.includes(value))
  assert.equal(failure.diagnostic.code, 'REQUEST_DENIED')
  assert.deepEqual(Object.keys(failure.diagnostic), ['code', 'message'])
})
