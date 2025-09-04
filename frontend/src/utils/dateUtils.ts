// Date conversion utility - converts YYYYMMDD integers to JavaScript Date objects
export const convertYYYYMMDDToDate = (dateInt: number | string): Date => {
  const dateStr = dateInt.toString()
  const year = parseInt(dateStr.substring(0, 4))
  const month = parseInt(dateStr.substring(4, 6)) - 1 // Month is 0-indexed in JavaScript
  const day = parseInt(dateStr.substring(6, 8))
  return new Date(year, month, day)
}

export const formatDateForChart = (dateInt: number | string): string => {
  return convertYYYYMMDDToDate(dateInt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateForDisplay = (dateInt: number | string): string => {
  return convertYYYYMMDDToDate(dateInt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
