/**
 * Download a CSV file in the browser.
 * - Escapes fields containing commas, quotes, or newlines per RFC 4180.
 * - Prepends a UTF-8 BOM so Excel opens it in the right encoding.
 */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    alert('Nothing to export.')
    return
  }

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      for (const k of Object.keys(row)) acc.add(k)
      return acc
    }, new Set<string>())
  )

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ]
  const csv = '\uFEFF' + lines.join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
