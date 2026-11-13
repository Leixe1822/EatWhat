// 使用 Google currentOpeningHours 的結構化時段，不解析翻譯後的營業文字。
// 此函式在查詢時執行；不會自行計時更新，也不會另外發出 API 請求。
type Point = { day: number; hour: number; minute: number }
type Hours = { periods: { open: Point; close?: Point | null }[] }
const MINUTES_PER_WEEK = 7 * 24 * 60

// 把星期及時間轉成「從週日 00:00 起算的分鐘數」；格式錯誤回傳 null。
function toWeekMinutes(point: Point | undefined): number | null {
  if (!point) return null

  const validDay = Number.isInteger(point.day) && point.day >= 0 && point.day <= 6
  const validHour = Number.isInteger(point.hour) && point.hour >= 0 && point.hour <= 23
  const validMinute = Number.isInteger(point.minute) && point.minute >= 0 && point.minute <= 59
  if (!validDay || !validHour || !validMinute) return null

  return point.day * 1440 + point.hour * 60 + point.minute
}

// true 表示營業中，false 表示休息中，null 表示資料不足。
// now 可由測試傳入固定時間；實際查詢預設使用當下時間。
export function getOpenNow(
  hours: Hours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  now = new Date(),
): boolean | null {
  if (!hours || !Array.isArray(hours.periods)) return null
  if (utcOffsetMinutes == null || !Number.isFinite(utcOffsetMinutes)) return null
  if (!Number.isFinite(now.getTime())) return null

  // 加上店家時差後使用 UTC getter，避免受到使用者電腦時區影響。
  const local = new Date(now.getTime() + utcOffsetMinutes * 60000)
  const current = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes()
  let incomplete = false

  for (const period of hours.periods) {
    const start = toWeekMinutes(period?.open)
    if (start === null) {
      incomplete = true
      continue
    }

    // Google 的全天營業慣例：唯一一段從週日 00:00 開始，且沒有結束時間。
    // 其他缺少結束時間的情況不自行推測為全天營業。
    if (period.close == null) {
      if (hours.periods.length === 1 && start === 0) return true
      incomplete = true
      continue
    }

    let end = toWeekMinutes(period.close)
    if (end === null || end === start) {
      incomplete = true
      continue
    }

    // 週六跨週日時，結束分鐘數小於開始值，需補上一週才可比較。
    if (end < start) end += MINUTES_PER_WEEK
    const withinThisWeek = current >= start && current < end
    const nextWeekCurrent = current + MINUTES_PER_WEEK
    const withinOvernightPeriod = nextWeekCurrent >= start && nextWeekCurrent < end
    // 開店時間含邊界，打烊時間不含；任何一段符合就代表營業中。
    if (withinThisWeek || withinOvernightPeriod) return true
  }

  // 完整時段都不符合（含空時段）才判為休息；有缺漏時保留未知。
  return incomplete ? null : false
}
