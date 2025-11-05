// Helper function to format date without timezone issues
export function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return ''
  // If it's a date string like "2024-01-15", parse it as local date
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dayStr = String(date.getDate()).padStart(2, '0')
    const monthStr = String(date.getMonth() + 1).padStart(2, '0')
    const yearStr = date.getFullYear()
    return `${dayStr}/${monthStr}/${yearStr}`
  }
  // Fallback: extract date components to avoid timezone shift
  const date = new Date(dateStr)
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayStr = String(localDate.getDate()).padStart(2, '0')
  const monthStr = String(localDate.getMonth() + 1).padStart(2, '0')
  const yearStr = localDate.getFullYear()
  return `${dayStr}/${monthStr}/${yearStr}`
}

