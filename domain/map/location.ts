// 所有搜尋共用的座標型別。lat 是緯度，lng 是經度。
export type Center = {
  lat: number
  lng: number
}

export function isValidCenter(center: Center) {
  const latitudeIsValid = Number.isFinite(center.lat) && Math.abs(center.lat) <= 90
  const longitudeIsValid = Number.isFinite(center.lng) && Math.abs(center.lng) <= 180
  return latitudeIsValid && longitudeIsValid
}

// URL 是外部輸入：拒絕缺值、重複參數、空白、非十進位格式與超出範圍。
export function parseCenter(params: Pick<URLSearchParams, 'getAll'>): Center | null {
  const lat = params.getAll('lat')
  const lng = params.getAll('lng')
  // 正規表示式只接受十進位數字；不接受空字串、NaN、Infinity 或十六進位。
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/
  if (lat.length !== 1 || lng.length !== 1) {
    return null
  }
  if (!decimal.test(lat[0]) || !decimal.test(lng[0])) {
    return null
  }
  const center = { lat: Number(lat[0]), lng: Number(lng[0]) }
  if (!isValidCenter(center)) {
    return null
  }
  return center
}

// 瀏覽器原本使用成功／失敗回呼；包成 Promise 後就能用 await 等待。
export function getCurrentCenter(): Promise<Center> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('此瀏覽器不支援定位，請改用地址搜尋。'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      error => {
        const messages: Record<number, string> = {
          1: '定位權限遭拒，請允許定位或改用地址搜尋。',
          2: '目前無法取得位置，請稍後重試或輸入地址。',
          3: '定位逾時，請重試或改用地址搜尋。',
        }
        reject(new Error(messages[error.code] ?? '定位失敗，請改用地址搜尋。'))
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  })
}
