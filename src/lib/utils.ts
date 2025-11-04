// Helper function to format date without timezone issues
export function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return ''
  // If it's a date string like "2024-01-15", parse it as local date
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString()
  }
  // Fallback: extract date components to avoid timezone shift
  const date = new Date(dateStr)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toLocaleDateString()
}

