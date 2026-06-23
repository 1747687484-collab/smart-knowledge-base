const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { formatDate } = require('../miniprogram/utils/date')

describe('date - formatDate', () => {
  it('formats a valid timestamp', () => {
    // 2026-01-15 10:30 in local time
    const ts = new Date(2026, 0, 15, 10, 30).getTime()
    const result = formatDate(ts)
    assert.ok(result.startsWith('2026-01-15'))
    assert.ok(result.includes('10:30'))
  })

  it('pads single digits with zeros', () => {
    const ts = new Date(2026, 0, 5, 9, 5).getTime()
    const result = formatDate(ts)
    assert.ok(result.includes('01-05'))
    assert.ok(result.includes('09:05'))
  })

  it('returns empty string for null/undefined', () => {
    assert.equal(formatDate(null), '')
    assert.equal(formatDate(undefined), '')
  })

  it('returns empty string for NaN', () => {
    assert.equal(formatDate(NaN), '')
  })

  it('returns empty string for invalid input', () => {
    assert.equal(formatDate('not a date'), '')
  })

  it('handles epoch zero', () => {
    const result = formatDate(0)
    assert.ok(typeof result === 'string')
    assert.ok(result.length > 0)
  })
})
