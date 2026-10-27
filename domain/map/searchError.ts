// 使用固定文案呈現錯誤；Google 原始文字僅供開發診斷，不能直接顯示給使用者。
const messages: Record<string, string> = {
  ZERO_RESULTS: '找不到這個地點，請換個地址或地標。',
  REQUEST_DENIED: '地址查詢遭 Google 拒絕（REQUEST_DENIED）。請確認 Geocoding API 已啟用、金鑰允許此 API 與目前網站來源，並檢查專案帳單。',
  OVER_QUERY_LIMIT: '地址查詢超過使用限制（OVER_QUERY_LIMIT），請稍後再試，並檢查 Google Cloud 配額與帳單。',
  OVER_DAILY_LIMIT: '地址查詢受每日使用限制或帳單設定影響（OVER_DAILY_LIMIT），請檢查 Google Cloud 配額、金鑰及帳單。',
  INVALID_REQUEST: '地址查詢參數無效（INVALID_REQUEST），請重新輸入地址。',
  UNKNOWN_ERROR: 'Google 地址服務暫時發生錯誤（UNKNOWN_ERROR），請稍後再試。',
  ERROR: '地址服務連線失敗（ERROR），請檢查網路後重試。',
}
const localMessages = new Set([
  '地址查詢逾時，請稍後重試。', '找不到這個地點，請換個地址或地標。',
  '取得的位置不合法，請重新選擇地點。', '此瀏覽器不支援定位，請改用地址搜尋。',
  '定位權限遭拒，請允許定位或改用地址搜尋。', '目前無法取得位置，請稍後重試或輸入地址。',
  '定位逾時，請重試或改用地址搜尋。', '定位失敗，請改用地址搜尋。',
])

export function describeSearchError(cause: unknown, apiKey: string | null, locating = false) {
  // catch 接到的值不一定是 Error，也可能是字串或一般物件。
  let record: Record<string, unknown> = {}
  if (typeof cause === 'object' && cause !== null) {
    record = cause as Record<string, unknown>
  }

  let rawMessage = '未提供錯誤訊息'
  if (typeof cause === 'string') {
    rawMessage = cause
  } else if (typeof record.message === 'string') {
    rawMessage = record.message
  }
  // Google 的狀態碼可能放在 code、status，或包在 message 裡。
  const candidates = [record.code, record.status, rawMessage]
  const knownCodePattern = /\b(?:ZERO_RESULTS|REQUEST_DENIED|OVER_QUERY_LIMIT|OVER_DAILY_LIMIT|INVALID_REQUEST|UNKNOWN_ERROR|ERROR)\b/
  let code = 'UNCLASSIFIED'
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }
    const match = candidate.match(knownCodePattern)
    if (match) {
      code = match[0]
      break
    }
  }
  // 不輸出 Error 物件、stack 或 cause；它們可能包含請求 URL 和金鑰。
  let diagnosticMessage = rawMessage
  if (apiKey) {
    for (const secret of new Set([apiKey, encodeURIComponent(apiKey)])) {
      diagnosticMessage = diagnosticMessage.split(secret).join('[REDACTED]')
    }
  }
  diagnosticMessage = diagnosticMessage
    .replace(/https?:\/\/[^\s<>"']+/gi, '[URL REDACTED]')
    .replace(/AIza[\w-]+/g, '[REDACTED]')
    .replace(/((?:api[_-]?key|key)\s*[=:]\s*)[^\s&,;]+/gi, '$1[REDACTED]')
  // 畫面只能顯示我們事先寫好的文案，不能直接顯示外部錯誤內容。
  let message = '地址搜尋失敗，請稍後重試；若持續發生，請檢查 Google Cloud 設定。'
  if (locating) {
    message = '定位失敗，請稍後重試或改用地址搜尋。'
  }
  if (messages[code]) {
    message = messages[code]
  }
  if (localMessages.has(rawMessage)) {
    message = rawMessage
  }

  return {
    message,
    diagnostic: { code, message: diagnosticMessage },
  }
}
