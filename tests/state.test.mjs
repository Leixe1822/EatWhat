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
    },
  }
  global.window = {
    location: {
      reload: () => {
        reloaded = true
      },
    },
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
            return new Promise(resolve => {
              resolveSearch = resolve
            })
          },
        },
      }),
    },
  }
  places.setQuery('台北 101')
  const request = places.searchRestaurants()
  await new Promise(resolve => setImmediate(resolve))
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
  assert.deepEqual(parseCenter(new URLSearchParams('lat=25.03&lng=121.56')), {
    lat: 25.03,
    lng: 121.56,
  })
  assert.deepEqual(parseCenter(new URLSearchParams('lat=0&lng=0')), { lat: 0, lng: 0 })
  assert.deepEqual(parseCenter(new URLSearchParams('lat=-90&lng=180')), { lat: -90, lng: 180 })
  for (const query of [
    '',
    'lat=&lng=0',
    'lat=91&lng=0',
    'lat=0&lng=-181',
    'lat=NaN&lng=0',
    'lat=Infinity&lng=0',
    'lat=0x10&lng=0',
    'lat=0&lat=1&lng=0',
    'lat=%20&lng=0',
  ]) {
    assert.equal(parseCenter(new URLSearchParams(query)), null, query)
  }
})
test('定位：成功、拒絕、位置不可用、逾時與不支援', async () => {
  const { getCurrentCenter } = load('domain/map/location.ts')
  const setNavigator = value =>
    Object.defineProperty(global, 'navigator', { configurable: true, value })
  setNavigator({
    geolocation: {
      getCurrentPosition: resolve => resolve({ coords: { latitude: 25, longitude: 121 } }),
    },
  })
  assert.deepEqual(await getCurrentCenter(), { lat: 25, lng: 121 })
  for (const [code, message] of [
    [1, /權限遭拒/],
    [2, /無法取得/],
    [3, /逾時/],
  ]) {
    setNavigator({ geolocation: { getCurrentPosition: (_, reject) => reject({ code }) } })
    await assert.rejects(getCurrentCenter(), message)
  }
  setNavigator({})
  await assert.rejects(getCurrentCenter(), /不支援/)
})

// 驗證實際請求參數、同座標共用 Promise，以及重複／無效餐廳的排除。
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
      },
    },
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
        location: { toJSON: () => ({ lat: 24, lng: 120 }) },
      },
      { id: 'missing' },
      { id: 'bad', location: { toJSON: () => ({ lat: 100, lng: 120 }) } },
      { id: 'one', location: { toJSON: () => ({ lat: 24, lng: 120 }) } },
    ],
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
      },
    },
  }
  await assert.rejects(fetchNearby(library, { lat: 23, lng: 120 }))
  assert.deepEqual(await fetchNearby(library, { lat: 23, lng: 120 }), [])
  assert.equal(count, 2)
  await assert.rejects(fetchNearby(library, { lat: 91, lng: 0 }))
  const resolvers = new Map()
  const delayed = {
    Place: {
      searchNearby: options =>
        new Promise(resolve => resolvers.set(options.locationRestriction.center.lat, resolve)),
    },
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
  for (const cause of [
    { code: 'REQUEST_DENIED' },
    { status: 'REQUEST_DENIED' },
    new Error('Places: REQUEST_DENIED: rejected'),
  ]) {
    assert.equal(searchError.describeSearchError(cause, null).diagnostic.code, 'REQUEST_DENIED')
    assert.match(searchError.describeSearchError(cause, null).message, /Places API \(New\)/)
  }
  for (const code of [
    'ZERO_RESULTS',
    'OVER_QUERY_LIMIT',
    'OVER_DAILY_LIMIT',
    'INVALID_REQUEST',
    'UNKNOWN_ERROR',
    'ERROR',
  ]) {
    assert.equal(searchError.describeSearchError(code, null).diagnostic.code, code)
  }
  const failure = searchError.describeSearchError(new Error('private details'), null)
  assert.equal(failure.diagnostic.message, 'private details')
  assert.ok(!failure.message.includes('private details'))
  assert.equal(
    searchError.describeSearchError(
      new Error('定位權限遭拒，請允許定位或改用地址搜尋。'),
      null,
      true,
    ).message,
    '定位權限遭拒，請允許定位或改用地址搜尋。',
  )
})
test('診斷訊息遮蔽金鑰和 URL，不包含原始 Error 物件', () => {
  const secret = 'test/key+secret'
  const cause = new Error(
    `REQUEST_DENIED ${secret} ${encodeURIComponent(secret)} ${fakeKey} https://example.com/?key=hidden key=another-secret`,
  )
  const failure = searchError.describeSearchError(cause, secret)
  const output = JSON.stringify(failure)
  for (const value of [secret, encodeURIComponent(secret), fakeKey, 'hidden', 'another-secret'])
    assert.ok(!output.includes(value))
  assert.equal(failure.diagnostic.code, 'REQUEST_DENIED')
  assert.deepEqual(Object.keys(failure.diagnostic), ['code', 'message'])
})

// 以固定座標與混合資料測試 AND 條件；包含未知、false、免費與超出半徑的案例。
test('本地篩選名稱、地址、距離與組合條件，未知不等於休息或免費', () => {
  const { DEFAULT_FILTERS, filterRestaurants, distanceMeters } = load('domain/places/filters.ts')
  const center = { lat: 25, lng: 121 }
  const base = { location: center, rating: null, uri: null }
  const restaurants = [
    { ...base, id: 'a', name: 'Cafe A', address: '台北路', cuisine: 'cafe', priceLevel: 'FREE', rating: 4.5, openNow: true },
    { ...base, id: 'b', name: '小吃', address: '台中路', cuisine: 'restaurant', priceLevel: 'MODERATE', rating: 3, openNow: false },
    { ...base, id: 'c', name: '未知', address: '台北路' },
    { ...base, id: 'd', name: '遠方', address: '', location: { lat: 25.04, lng: 121 } },
  ]
  // 測試只比較 ID，讓失敗訊息直接指出哪些餐廳被錯誤納入或排除。
  const ids = filters => filterRestaurants(restaurants, center, { ...DEFAULT_FILTERS, ...filters }).map(r => r.id)
  assert.deepEqual(ids({}), ['a', 'b', 'c'])
  assert.deepEqual(ids({ keyword: '  CAFE ' }), ['a'])
  assert.deepEqual(ids({ keyword: '台北' }), ['a', 'c'])
  assert.deepEqual(ids({ cuisine: 'cafe', price: 'FREE', rating: 4, opening: 'open' }), ['a'])
  assert.deepEqual(ids({ opening: 'closed' }), ['b'])
  assert.deepEqual(ids({ opening: 'unknown', price: 'unknown' }), ['c'])
  assert.deepEqual(ids({ rating: 4.5, keyword: '小吃' }), [])
  assert.equal(distanceMeters(center, center), 0)
  const nearby = [{ ...restaurants[0], location: { lat: 25.01, lng: 121 } }]
  assert.equal(filterRestaurants(nearby, center, { ...DEFAULT_FILTERS, distance: 1000 }).length, 0)
  assert.equal(filterRestaurants(nearby, center, DEFAULT_FILTERS).length, 1)
  assert.equal(DEFAULT_FILTERS.distance, 3000)
})

// 模擬 Google 回覆，確認 null 和 false 不會因預設值處理而混淆。
test('Nearby 保留價格與營業狀態未知，也保留已知的 false', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const results = await fetchNearby({ Place: { searchNearby: async options => {
    for (const field of ['priceLevel', 'primaryType', 'currentOpeningHours']) assert.ok(options.fields.includes(field))
    return { places: [
      { id: 'unknown', location: { toJSON: () => ({ lat: 19, lng: 121 }) } },
      { id: 'closed', location: { toJSON: () => ({ lat: 19, lng: 121 }) }, priceLevel: 'FREE', currentOpeningHours: { periods: [] }, utcOffsetMinutes: 480 },
    ] }
  } } }, { lat: 19, lng: 121 })
  assert.equal(results[0].priceLevel, null)
  assert.equal(results[0].openNow, null)
  assert.equal(results[1].priceLevel, 'FREE')
  assert.equal(results[1].openNow, false)
})

test('固定料理分組合併細分類，保留零筆選項並將未知類型歸入其他', () => {
  const { getCuisineOptions, getCuisineGroup, filterRestaurants, DEFAULT_FILTERS } = load('domain/places/filters.ts')
  const center = { lat: 25, lng: 121 }
  const restaurants = ['ramen_restaurant', 'japanese_restaurant', 'korean_barbecue_restaurant', null, 'unlisted_type'].map((cuisine, index) => ({
    id: String(index), name: '餐廳', address: '', location: center, rating: null, uri: null, cuisine,
  }))
  const options = getCuisineOptions(restaurants)
  assert.equal(options.find(group => group.value === 'japanese').count, 2)
  assert.equal(options.find(group => group.value === 'korean').count, 1)
  assert.equal(options.find(group => group.value === 'chinese').count, 0)
  assert.equal(options.find(group => group.value === 'other').count, 2)
  assert.equal(options.reduce((sum, group) => sum + group.count, 0), restaurants.length)
  assert.equal(getCuisineGroup(undefined), 'other')
  assert.deepEqual(filterRestaurants(restaurants, center, { ...DEFAULT_FILTERS, cuisine: 'japanese' }).map(r => r.id), ['0', '1'])
  assert.ok(getCuisineOptions([]).every(group => group.count === 0))
})

test('Nearby 排除婚宴及飯店類型，保留一般餐廳且不以店名猜測', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const location = { toJSON: () => ({ lat: 18, lng: 121 }) }
  const results = await fetchNearby({ Place: { searchNearby: async options => {
    assert.ok(options.fields.includes('types'))
    return { places: [
      { id: 'wedding', location, primaryType: 'wedding_venue' },
      { id: 'banquet', location, primaryType: 'banquet_hall' },
      { id: 'hotel', location, primaryType: 'hotel' },
      { id: 'mixed', location, primaryType: 'restaurant', types: ['restaurant', 'lodging'] },
      { id: 'normal', location, primaryType: 'chinese_restaurant', displayName: '家常飯店' },
      { id: 'unknown', location },
    ] }
  } } }, { lat: 18, lng: 121 })
  assert.deepEqual(results.map(r => r.id), ['normal', 'unknown'])
})

test('料理分組採指定順序，火鍋與燒烤獨立分類', () => {
  const { CUISINE_GROUPS, getCuisineGroup } = load('domain/places/filters.ts')
  assert.deepEqual(CUISINE_GROUPS.map(group => group.label), [
    '台式料理', '中式料理', '日式料理', '韓式料理', '美式料理', '義式料理', '東南亞料理',
    '火鍋', '燒烤', '早餐／早午餐', '素食／蔬食', '咖啡／甜點', '其他',
  ])
  for (const [type, group] of [
    ['taiwanese_restaurant', 'taiwanese'], ['hot_pot_restaurant', 'hot_pot'],
    ['yakitori_restaurant', 'barbecue'], ['yakiniku_restaurant', 'barbecue'],
    ['korean_barbecue_restaurant', 'korean'], ['hamburger_restaurant', 'american'],
    ['pizza_restaurant', 'italian'], ['thai_restaurant', 'southeast_asian'],
    ['vegan_restaurant', 'vegetarian'], ['seafood_restaurant', 'other'],
    ['snack_bar', 'other'], ['indian_restaurant', 'other'],
  ]) assert.equal(getCuisineGroup(type), group)
  const types = CUISINE_GROUPS.flatMap(group => group.types)
  assert.equal(new Set(types).size, types.length)
})

test('Nearby 補排除僅標為餐廳的婚宴場所，避免泛稱誤判', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const names = ['幸福婚宴會館', '婚禮莊園', '宴會廳', 'Wedding Venue', 'Grand Banquet Hall', '家常飯店', '美食會館', '宴客餐廳']
  const results = await fetchNearby({ Place: { searchNearby: async () => ({ places: [
    ...names.map((displayName, index) => ({
      id: String(index), displayName, primaryType: 'restaurant',
      location: { toJSON: () => ({ lat: 17, lng: 121 }) },
    })),
    { id: 'label', displayName: '幸福莊園', primaryType: 'restaurant', primaryTypeDisplayName: '婚宴場地', location: { toJSON: () => ({ lat: 17, lng: 121 }) } },
  ] }) } }, { lat: 17, lng: 121 })
  assert.deepEqual(results.map(r => r.name), ['家常飯店', '美食會館', '宴客餐廳'])
})

test('Nearby 按選定半徑查詢，切回相同半徑仍可強制重新請求', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const radii = []
  const library = { Place: { searchNearby: async options => {
    radii.push(options.locationRestriction.radius)
    return { places: [] }
  } } }
  const center = { lat: 16, lng: 121 }
  for (const radius of [500, 1000, 2000, 3000, 500]) await fetchNearby(library, center, radius, true)
  assert.deepEqual(radii, [500, 1000, 2000, 3000, 500])
  await fetchNearby(library, center, 500)
  assert.equal(radii.length, 5)
  await assert.rejects(fetchNearby(library, center, -1), /無效搜尋半徑/)
})

test('Nearby 補查排除後的缺額，去重、維持半徑並滿 20 筆停止', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const center = { lat: 15, lng: 121 }
  const place = (id, extra = {}) => ({ id, location: { toJSON: () => center }, ...extra })
  let calls = 0
  const results = await fetchNearby({ Place: { searchNearby: async request => {
    calls++
    assert.equal(request.locationRestriction.radius, 500)
    assert.deepEqual(request.locationRestriction.center, center)
    assert.ok(request.excludedTypes.includes('hotel'))
    assert.ok(request.excludedTypes.includes('wedding_venue'))
    if (calls === 1) return { places: Array.from({ length: 20 }, (_, i) => place(String(i), i < 3 ? { primaryType: 'hotel' } : {})) }
    assert.ok(request.includedPrimaryTypes.length)
    return { places: [place('3'), place('20'), place('21'), place('22'), place('23')] }
  } } }, center, 500)
  assert.equal(calls, 2)
  assert.equal(results.length, 20)
  assert.equal(new Set(results.map(r => r.id)).size, 20)
  assert.ok(!results.some(r => r.id === '0'))
})

test('Nearby 補查最多三次，補查錯誤仍保留有效餐廳', async () => {
  const { fetchNearby } = load('domain/places/nearby.ts')
  const center = { lat: 14, lng: 121 }
  const batch = Array.from({ length: 20 }, (_, i) => ({ id: String(i), primaryType: i === 0 ? 'hotel' : 'restaurant', location: { toJSON: () => center } }))
  let calls = 0
  const library = { Place: { searchNearby: async () => { calls++; return { places: batch } } } }
  assert.equal((await fetchNearby(library, center)).length, 19)
  assert.equal(calls, 4)
  calls = 0
  library.Place.searchNearby = async () => {
    if (++calls > 1) throw new Error('補查失敗')
    return { places: batch }
  }
  assert.equal((await fetchNearby(library, center, 3000, true)).length, 19)
  assert.equal(calls, 2)
})

test('currentOpeningHours 依店家時區判斷多段營業、跨日、全天及缺值', () => {
  const { getOpenNow } = load('domain/places/openingHours.ts')
  const point = (day, hour, minute = 0) => ({ day, hour, minute })
  const hours = { periods: [
    { open: point(1, 9), close: point(1, 12) },
    { open: point(1, 17), close: point(1, 22) },
  ] }
  const at = iso => new Date(iso)
  assert.equal(getOpenNow(hours, 480, at('2026-11-16T01:00:00Z')), true)
  assert.equal(getOpenNow(hours, 480, at('2026-11-16T04:00:00Z')), false)
  assert.equal(getOpenNow(hours, 480, at('2026-11-16T09:00:00Z')), true)
  const overnight = { periods: [{ open: point(6, 22), close: point(0, 2) }] }
  assert.equal(getOpenNow(overnight, 0, at('2026-11-15T01:00:00Z')), true)
  assert.equal(getOpenNow(overnight, 0, at('2026-11-15T02:00:00Z')), false)
  assert.equal(getOpenNow({ periods: [{ open: point(0, 0) }] }, -300), true)
  assert.equal(getOpenNow({ periods: [] }, 0), false)
  assert.equal(getOpenNow(null, 480), null)
  assert.equal(getOpenNow(hours, null), null)
  assert.equal(getOpenNow({ periods: [{ open: point(1, 9) }] }, 480), null)
})
