export interface DataPoint {
  x: number
  y: number
  y2?: number
}

export interface TableRow {
  id: number
  selected: boolean
  index: number
  [key: string]: number | boolean
}

// Generate sample chart data
export function generateChartData(length = 50): DataPoint[] {
  return Array.from({ length }, (_, i) => ({
    x: i,
    y: Math.sin(i / 5) * 10 + 50 + Math.random() * 5,
    y2: Math.cos(i / 5) * 8 + 45 + Math.random() * 3,
  }))
}

// Generate sample table data
export function generateTableData(rows = 10): TableRow[] {
  return Array.from({ length: rows }, (_, i) => ({
    id: i + 1,
    selected: true,
    index: i + 1,
    value1: 45 + Math.random() * 10,
    value2: 47 + Math.random() * 8,
    value3: 49 + Math.random() * 6,
  }))
}

// Validate numeric input
export function validateNumber(value: string, min?: number, max?: number): boolean {
  const num = Number.parseFloat(value)
  if (isNaN(num)) return false
  if (min !== undefined && num <= min) return false
  if (max !== undefined && num >= max) return false
  return true
}

// Format number for display
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

// Export data to CSV
export function exportToCSV(data: TableRow[], filename: string): void {
  const headers = Object.keys(data[0]).filter((key) => key !== "id")
  const csvContent = [headers.join(","), ...data.map((row) => headers.map((header) => row[header]).join(","))].join(
    "\n",
  )

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
