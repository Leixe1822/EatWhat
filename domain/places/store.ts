import { create } from 'zustand'
import { updateCenter } from '@/domain/map/store'

export type Restaurant = {
  id: string
  name: string
  address: string
  location: google.maps.LatLngLiteral
  rating: number | null
  uri: string | null
}
export type PlacesStore = {
  query: string
  status: 'idle' | 'locating' | 'searching' | 'success' | 'error'
  error: string | null
  restaurants: Restaurant[]
  selectedId: string | null
}

const usePlacesStore = create<PlacesStore>(() => ({
  query: '',
  status: 'idle',
  error: null,
  restaurants: [],
  selectedId: null,
}))

export default usePlacesStore
export function setQuery(query: string) {
  usePlacesStore.setState({ query })
}

export function selectRestaurant(id: string) {
  const place = usePlacesStore
    .getState()
    .restaurants.find((restaurant) => restaurant.id === id)
  if (!place) {
    return
  }
  usePlacesStore.setState({ selectedId: id })
  updateCenter(place.location)
}

export function pickRestaurant() {
  const places = usePlacesStore.getState().restaurants
  if (places.length === 0) {
    return
  }
  const randomIndex = Math.floor(Math.random() * places.length)
  const restaurant = places[randomIndex]
  selectRestaurant(restaurant.id)
}
export async function searchRestaurants(useLocation = false) {
  const { status, query } = usePlacesStore.getState()
  if (status === 'locating' || status === 'searching') {
    return
  }
  if (!useLocation && !query.trim()) {
    usePlacesStore.setState({ status: 'error', error: '請輸入地址或地標。' })
    return
  }
  usePlacesStore.setState({
    status: useLocation ? 'locating' : 'searching',
    error: null,
    restaurants: [],
    selectedId: null,
  })
  try {
    let center: google.maps.LatLngLiteral
    if (useLocation) {
      center = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('此瀏覽器不支援定位，請輸入地址。'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          },
          (error) => {
            let message = '無法取得位置，請重試或輸入地址。'
            if (error.code === 1) {
              message = '定位權限遭拒，請允許定位或改用地址搜尋。'
            }
            reject(new Error(message))
          },
          { timeout: 10000, maximumAge: 60000 }
        )
      })
    } else {
      const { Place } = (await google.maps.importLibrary(
        'places'
      )) as google.maps.PlacesLibrary
      const { places } = await Place.searchByText({
        textQuery: query.trim(),
        fields: ['location'],
        maxResultCount: 1,
      })
      if (!places[0]?.location)
        throw new Error('找不到這個地址或地標，請換個名稱試試。')
      center = places[0].location.toJSON()
    }
    usePlacesStore.setState({ status: 'searching' })
    updateCenter(center)
    const { Place } = (await google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary
    const { places } = await Place.searchNearby({
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'googleMapsURI',
      ],
      locationRestriction: { center, radius: 1000 },
      includedTypes: ['restaurant'],
      maxResultCount: 20,
    })
    // 把 Google 回傳的資料整理成畫面需要的欄位。
    const restaurants: Restaurant[] = []
    for (const place of places) {
      if (!place.location) {
        continue
      }
      restaurants.push({
        id: place.id,
        name: place.displayName ?? '餐廳',
        address: place.formattedAddress ?? '',
        location: place.location.toJSON(),
        rating: place.rating ?? null,
        uri: place.googleMapsURI ?? null,
      })
    }
    usePlacesStore.setState({ restaurants, status: 'success' })
  } catch (error) {
    let message =
      '搜尋失敗，請確認網路、金鑰權限、Places API (New) 與帳單設定後重試。'
    // 定位和地址錯誤可以直接顯示；Google 的錯誤改用上面的提示。
    if (
      error instanceof Error &&
      /^(此瀏覽器|定位|無法取得|找不到)/.test(error.message)
    ) {
      message = error.message
    }
    usePlacesStore.setState({ status: 'error', error: message })
  }
}
