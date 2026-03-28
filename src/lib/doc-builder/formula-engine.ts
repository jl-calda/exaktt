// src/lib/doc-builder/formula-engine.ts
// Simple formula evaluator for the spreadsheet block
// Supports: cell refs (A1), ranges (A1:A5), SUM, AVERAGE, COUNT, MIN, MAX, IF, +, -, *, /

import type { CellData } from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert column letter(s) to 0-based index: A→0, B→1, Z→25, AA→26 */
export function colLetterToIndex(letter: string): number {
  let idx = 0
  for (let i = 0; i < letter.length; i++) {
    idx = idx * 26 + (letter.charCodeAt(i) - 64)
  }
  return idx - 1
}

/** Convert 0-based index to column letter: 0→A, 1→B, 25→Z, 26→AA */
export function indexToColLetter(idx: number): string {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

/** Parse a cell reference like "A1" → { col: 0, row: 0 } */
function parseCellRef(ref: string): { col: number; row: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  return { col: colLetterToIndex(m[1]), row: parseInt(m[2], 10) - 1 }
}

/** Expand a range like "A1:C3" into an array of cell keys */
function expandRange(range: string): string[] {
  const parts = range.split(':')
  if (parts.length !== 2) return []
  const start = parseCellRef(parts[0])
  const end = parseCellRef(parts[1])
  if (!start || !end) return []

  const keys: string[] = []
  const minCol = Math.min(start.col, end.col)
  const maxCol = Math.max(start.col, end.col)
  const minRow = Math.min(start.row, end.row)
  const maxRow = Math.max(start.row, end.row)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      keys.push(`${indexToColLetter(c)}${r + 1}`)
    }
  }
  return keys
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'cell'; value: string }
  | { type: 'range'; value: string }
  | { type: 'func'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma'; value?: undefined }

/** Get the value of a token safely (returns empty string for comma tokens) */
function tokVal(t: Token): any { return 'value' in t ? t.value : '' }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    if (expr[i] === ' ') { i++; continue }

    // Number
    if (/\d/.test(expr[i]) || (expr[i] === '.' && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      let num = ''
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++]
      }
      tokens.push({ type: 'number', value: parseFloat(num) })
      continue
    }

    // String literal
    if (expr[i] === '"') {
      let s = ''
      i++
      while (i < expr.length && expr[i] !== '"') s += expr[i++]
      i++ // closing quote
      tokens.push({ type: 'string', value: s })
      continue
    }

    // Cell ref, range, or function
    if (/[A-Z]/i.test(expr[i])) {
      let id = ''
      while (i < expr.length && /[A-Z0-9]/i.test(expr[i])) id += expr[i++]
      // Check for range (A1:B2)
      if (i < expr.length && expr[i] === ':') {
        i++
        let end = ''
        while (i < expr.length && /[A-Z0-9]/i.test(expr[i])) end += expr[i++]
        tokens.push({ type: 'range', value: `${id.toUpperCase()}:${end.toUpperCase()}` })
      }
      // Check if it's a function (followed by open paren)
      else if (i < expr.length && expr[i] === '(') {
        tokens.push({ type: 'func', value: id.toUpperCase() })
      }
      // Otherwise it's a cell ref
      else {
        tokens.push({ type: 'cell', value: id.toUpperCase() })
      }
      continue
    }

    if ('+-*/'.includes(expr[i])) {
      tokens.push({ type: 'op', value: expr[i++] })
      continue
    }
    if (expr[i] === '>' || expr[i] === '<' || expr[i] === '=') {
      let op = expr[i++]
      if (i < expr.length && expr[i] === '=') op += expr[i++]
      tokens.push({ type: 'op', value: op })
      continue
    }
    if (expr[i] === '(' || expr[i] === ')') {
      tokens.push({ type: 'paren', value: expr[i++] as '(' | ')' })
      continue
    }
    if (expr[i] === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }
    i++ // skip unknown chars
  }
  return tokens
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

type CellGetter = (key: string) => number

function resolveRange(rangeStr: string, getCell: CellGetter): number[] {
  return expandRange(rangeStr).map(getCell)
}

function evalTokens(tokens: Token[], getCell: CellGetter): number {
  let pos = 0

  function parseExpr(): number {
    let left = parseTerm()
    while (pos < tokens.length && tokens[pos].type === 'op' && '+-'.includes(tokens[pos].value as string)) {
      const op = (tokens[pos++] as { value: string }).value
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function parseTerm(): number {
    let left = parseComparison()
    while (pos < tokens.length && tokens[pos].type === 'op' && '*/'.includes(tokens[pos].value as string)) {
      const op = (tokens[pos++] as { value: string }).value
      const right = parseComparison()
      left = op === '*' ? left * right : (right !== 0 ? left / right : 0)
    }
    return left
  }

  function parseComparison(): number {
    let left = parseUnary()
    if (pos < tokens.length && tokens[pos].type === 'op') {
      const op = (tokens[pos] as { value: string }).value
      if (['>', '<', '>=', '<=', '=', '=='].includes(op)) {
        pos++
        const right = parseUnary()
        switch (op) {
          case '>':  return left > right ? 1 : 0
          case '<':  return left < right ? 1 : 0
          case '>=': return left >= right ? 1 : 0
          case '<=': return left <= right ? 1 : 0
          case '=': case '==': return left === right ? 1 : 0
        }
      }
    }
    return left
  }

  function parseUnary(): number {
    if (pos < tokens.length && tokens[pos].type === 'op' && tokens[pos].value === '-') {
      pos++
      return -parsePrimary()
    }
    return parsePrimary()
  }

  function parsePrimary(): number {
    if (pos >= tokens.length) return 0
    const tok = tokens[pos]

    if (tok.type === 'number') { pos++; return tok.value }
    if (tok.type === 'string') { pos++; return parseFloat(tok.value) || 0 }
    if (tok.type === 'cell') { pos++; return getCell(tok.value) }

    if (tok.type === 'func') {
      const fname = tok.value
      pos++ // skip func name
      if (pos < tokens.length && tokens[pos].type === 'paren' && tokens[pos].value === '(') pos++ // skip (

      const args: number[] = []
      const ranges: number[][] = []

      while (pos < tokens.length && !(tokens[pos].type === 'paren' && tokens[pos].value === ')')) {
        if (tokens[pos].type === 'comma') { pos++; continue }
        if (tokens[pos].type === 'range') {
          const vals = resolveRange(tokens[pos].value as string, getCell)
          ranges.push(vals)
          args.push(...vals)
          pos++
        } else {
          args.push(parseExpr())
        }
      }
      if (pos < tokens.length) pos++ // skip )

      return evalFunction(fname, args)
    }

    if (tok.type === 'paren' && tok.value === '(') {
      pos++
      const val = parseExpr()
      if (pos < tokens.length && tokens[pos].type === 'paren' && tokens[pos].value === ')') pos++
      return val
    }

    if (tok.type === 'range') {
      const vals = resolveRange(tok.value as string, getCell)
      pos++
      return vals.reduce((a, b) => a + b, 0) // Default: treat bare range as SUM
    }

    pos++
    return 0
  }

  return parseExpr()
}

function evalFunction(name: string, args: number[]): number {
  const nums = args.filter(n => !isNaN(n))
  switch (name) {
    case 'SUM':     return nums.reduce((a, b) => a + b, 0)
    case 'AVERAGE': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    case 'COUNT':   return nums.length
    case 'MIN':     return nums.length ? Math.min(...nums) : 0
    case 'MAX':     return nums.length ? Math.max(...nums) : 0
    case 'ABS':     return Math.abs(args[0] ?? 0)
    case 'ROUND':   return Math.round(args[0] ?? 0)
    case 'IF':      return args[0] ? (args[1] ?? 0) : (args[2] ?? 0)
    default:        return 0
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Evaluate a formula string (starting with =) given a cells map */
export function evaluateFormula(
  formula: string,
  cells: Record<string, CellData>,
  visited: Set<string> = new Set(),
  currentKey?: string,
): number {
  const expr = formula.startsWith('=') ? formula.slice(1) : formula

  const getCell = (key: string): number => {
    if (visited.has(key)) return 0 // Circular reference → 0
    const cell = cells[key]
    if (!cell) return 0
    if (cell.formula) {
      const next = new Set(visited)
      if (currentKey) next.add(currentKey)
      return evaluateFormula(cell.formula, cells, next, key)
    }
    return parseFloat(cell.value) || 0
  }

  try {
    const tokens = tokenize(expr)
    return evalTokens(tokens, getCell)
  } catch {
    return 0
  }
}

/** Resolve all cells in a spreadsheet, returning display values */
export function resolveAllCells(cells: Record<string, CellData>): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const key in cells) {
    const cell = cells[key]
    if (cell.formula) {
      const val = evaluateFormula(cell.formula, cells, new Set(), key)
      if (cell.format === 'currency') {
        resolved[key] = val.toFixed(2)
      } else if (cell.format === 'percent') {
        resolved[key] = (val * 100).toFixed(1) + '%'
      } else if (cell.format === 'number') {
        resolved[key] = val.toLocaleString()
      } else {
        resolved[key] = isNaN(val) ? '#ERR' : String(val)
      }
    } else {
      resolved[key] = cell.value
    }
  }
  return resolved
}

/** Get dependencies of a formula (which cells it references) */
export function getFormulaDeps(formula: string): string[] {
  if (!formula.startsWith('=')) return []
  const tokens = tokenize(formula.slice(1))
  const deps: string[] = []
  for (const tok of tokens) {
    if (tok.type === 'cell') deps.push(tok.value)
    if (tok.type === 'range') deps.push(...expandRange(tok.value))
  }
  return deps
}
