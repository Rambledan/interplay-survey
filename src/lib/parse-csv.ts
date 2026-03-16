/**
 * parse-csv.ts
 * Minimal RFC 4180-compliant CSV parser for reading back responses.csv
 */

/** Parses a single CSV line, handling quoted fields and escaped double-quotes. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields
}

/** Parses an entire CSV string into rows (skips blank lines). */
export function parseCsv(text: string): string[][] {
  return text
    .split('\n')
    .map(l => l.replace(/\r$/, '')) // strip Windows line endings
    .filter(l => l.trim() !== '')
    .map(parseCsvLine)
}
