// 料理分類共用表：查詢條件與本地分類使用同一份代碼，避免兩邊判斷不同。
import type { Restaurant } from './store'

// 固定分組使用 Google 主要類型代碼；每間店只歸入一組，未涵蓋的類型歸入其他。
export const CUISINE_GROUPS = [
  // 僅依明確的台式分類，不把所有 snack_bar 或一般餐廳推測成台式小吃。
  { value: 'taiwanese', label: '台式料理', types: ['taiwanese_restaurant'] },
  {
    value: 'chinese',
    label: '中式料理',
    types: [
      'chinese_restaurant',
      'chinese_noodle_restaurant',
      'dim_sum_restaurant',
      'dumpling_restaurant',
      'cantonese_restaurant'
    ]
  },
  {
    value: 'japanese',
    label: '日式料理',
    types: [
      'japanese_restaurant',
      'ramen_restaurant',
      'japanese_curry_restaurant',
      'japanese_izakaya_restaurant',
      'sushi_restaurant',
      'tonkatsu_restaurant'
    ]
  },
  { value: 'korean', label: '韓式料理', types: ['korean_restaurant', 'korean_barbecue_restaurant'] },
  { value: 'american', label: '美式料理', types: ['american_restaurant', 'hamburger_restaurant'] },
  { value: 'italian', label: '義式料理', types: ['italian_restaurant', 'pizza_restaurant'] },
  {
    value: 'southeast_asian',
    label: '東南亞料理',
    types: [
      'thai_restaurant',
      'vietnamese_restaurant',
      'indonesian_restaurant',
      'malaysian_restaurant',
      'filipino_restaurant',
      'cambodian_restaurant',
      'burmese_restaurant'
    ]
  },
  { value: 'hot_pot', label: '火鍋', types: ['hot_pot_restaurant'] },
  {
    value: 'barbecue',
    label: '燒烤',
    types: [
      'barbecue_restaurant',
      'mongolian_barbecue_restaurant',
      'yakiniku_restaurant',
      'yakitori_restaurant'
    ]
  },
  { value: 'breakfast', label: '早餐／早午餐', types: ['breakfast_restaurant', 'brunch_restaurant'] },
  { value: 'vegetarian', label: '素食／蔬食', types: ['vegetarian_restaurant', 'vegan_restaurant'] },
  {
    value: 'cafe',
    label: '咖啡／甜點',
    types: [
      'cafe',
      'coffee_shop',
      'cat_cafe',
      'dog_cafe',
      'bakery',
      'dessert_shop',
      'dessert_restaurant',
      'ice_cream_shop',
      'cake_shop',
      'donut_shop',
      'pastry_shop'
    ]
  },
  { value: 'other', label: '其他', types: [] },
]

// 找不到類型或資料缺漏時，統一歸入「其他」，避免遺漏餐廳。
export function getCuisineGroup(cuisine: string | null | undefined): string {
  return CUISINE_GROUPS.find(group => group.types.includes(cuisine ?? ''))?.value ?? 'other'
}

// 此計數工具保留供呼叫端使用；目前選單直接列出全部分組，不依零筆停用。
// 以本次完整結果計數，不隨其他篩選改變，也不代表附近所有餐廳的數量。
export function getCuisineOptions(restaurants: Restaurant[]) {
  return CUISINE_GROUPS.map(group => ({
    ...group,
    count: restaurants.filter(restaurant => getCuisineGroup(restaurant.cuisine) === group.value).length,
  }))
}

