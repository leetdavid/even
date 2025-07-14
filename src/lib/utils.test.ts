import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  cn, 
  calculateEqualSplits, 
  calculatePercentageSplits, 
  validateSplits, 
  validatePayments, 
  formatCurrency, 
  calculateDebts,
  formatRelativeTime,
  describeExpenseChange,
  parseExpenseCategory
} from './utils'

type ExpenseSplit = {
  userId: string
  amount?: string
  percentage?: number
}

type ExpensePayment = {
  userId: string
  amount?: string
  percentage?: number
}

describe('cn utility function', () => {
  it('should combine class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })

  it('should handle objects with boolean values', () => {
    expect(cn({
      'foo': true,
      'bar': false,
      'baz': true
    })).toBe('foo baz')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })
})

describe('calculateEqualSplits', () => {
  it('should calculate equal splits correctly', () => {
    const result = calculateEqualSplits(100, ['user1', 'user2', 'user3'])
    
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      userId: 'user1',
      amount: '33.33',
      percentage: 33.33
    })
    expect(result[1]).toEqual({
      userId: 'user2',
      amount: '33.33',
      percentage: 33.33
    })
    expect(result[2]).toEqual({
      userId: 'user3',
      amount: '33.33',
      percentage: 33.33
    })
  })

  it('should handle two participants', () => {
    const result = calculateEqualSplits(50, ['user1', 'user2'])
    
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      userId: 'user1',
      amount: '25.00',
      percentage: 50
    })
    expect(result[1]).toEqual({
      userId: 'user2',
      amount: '25.00',
      percentage: 50
    })
  })

  it('should return empty array for no participants', () => {
    const result = calculateEqualSplits(100, [])
    expect(result).toEqual([])
  })

  it('should handle single participant', () => {
    const result = calculateEqualSplits(100, ['user1'])
    
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      userId: 'user1',
      amount: '100.00',
      percentage: 100
    })
  })
})

describe('calculatePercentageSplits', () => {
  it('should calculate amounts from percentages', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', percentage: 60 },
      { userId: 'user2', percentage: 40 }
    ]
    
    const result = calculatePercentageSplits(100, splits)
    
    expect(result[0]).toEqual({
      userId: 'user1',
      percentage: 60,
      amount: '60.00'
    })
    expect(result[1]).toEqual({
      userId: 'user2',
      percentage: 40,
      amount: '40.00'
    })
  })

  it('should handle splits without percentage', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', percentage: 50 },
      { userId: 'user2' } // No percentage
    ]
    
    const result = calculatePercentageSplits(100, splits)
    
    expect(result[0]).toEqual({
      userId: 'user1',
      percentage: 50,
      amount: '50.00'
    })
    expect(result[1]).toEqual({
      userId: 'user2',
      amount: '0.00'
    })
  })
})

describe('validateSplits', () => {
  it('should validate equal splits (always valid if provided)', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', amount: '50.00' },
      { userId: 'user2', amount: '50.00' }
    ]
    
    const result = validateSplits(100, splits, 'equal')
    expect(result.isValid).toBe(true)
  })

  it('should validate percentage splits that add up to 100%', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', percentage: 60 },
      { userId: 'user2', percentage: 40 }
    ]
    
    const result = validateSplits(100, splits, 'percentage')
    expect(result.isValid).toBe(true)
  })

  it('should reject percentage splits that do not add up to 100%', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', percentage: 60 },
      { userId: 'user2', percentage: 30 }
    ]
    
    const result = validateSplits(100, splits, 'percentage')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('90.00%')
  })

  it('should validate custom splits that add up to total amount', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', amount: '70.00' },
      { userId: 'user2', amount: '30.00' }
    ]
    
    const result = validateSplits(100, splits, 'custom')
    expect(result.isValid).toBe(true)
  })

  it('should reject custom splits that do not add up to total amount', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'user1', amount: '60.00' },
      { userId: 'user2', amount: '30.00' }
    ]
    
    const result = validateSplits(100, splits, 'custom')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('90.00')
  })

  it('should reject empty splits', () => {
    const result = validateSplits(100, [], 'equal')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('No splits provided')
  })
})

describe('validatePayments', () => {
  it('should validate single payment for full amount', () => {
    const payments: ExpensePayment[] = [
      { userId: 'user1', amount: '100.00' }
    ]
    
    const result = validatePayments(100, payments, 'single')
    expect(result.isValid).toBe(true)
  })

  it('should reject single payment for partial amount', () => {
    const payments: ExpensePayment[] = [
      { userId: 'user1', amount: '80.00' }
    ]
    
    const result = validatePayments(100, payments, 'single')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('100.00')
  })

  it('should validate percentage payments that add up to 100%', () => {
    const payments: ExpensePayment[] = [
      { userId: 'user1', percentage: 70 },
      { userId: 'user2', percentage: 30 }
    ]
    
    const result = validatePayments(100, payments, 'percentage')
    expect(result.isValid).toBe(true)
  })

  it('should validate custom payments that add up to total amount', () => {
    const payments: ExpensePayment[] = [
      { userId: 'user1', amount: '80.00' },
      { userId: 'user2', amount: '20.00' }
    ]
    
    const result = validatePayments(100, payments, 'custom')
    expect(result.isValid).toBe(true)
  })
})

describe('formatCurrency', () => {
  it('should format number amounts correctly', () => {
    expect(formatCurrency(123.45)).toBe('USD 123.45')
    expect(formatCurrency(100)).toBe('USD 100.00')
  })

  it('should format string amounts correctly', () => {
    expect(formatCurrency('123.45')).toBe('USD 123.45')
    expect(formatCurrency('100')).toBe('USD 100.00')
  })

  it('should handle different currencies', () => {
    expect(formatCurrency(100, 'EUR')).toBe('EUR 100.00')
    expect(formatCurrency(100, 'GBP')).toBe('GBP 100.00')
  })

  it('should handle invalid amounts', () => {
    expect(formatCurrency('invalid')).toBe('USD 0.00')
    expect(formatCurrency(NaN)).toBe('USD 0.00')
  })
})

describe('calculateDebts', () => {
  it('should calculate simple debt correctly', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'alice', amount: '50.00' },
      { userId: 'bob', amount: '50.00' }
    ]
    
    const payments: ExpensePayment[] = [
      { userId: 'alice', amount: '100.00' }
    ]
    
    const result = calculateDebts(splits, payments)
    
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      from: 'bob',
      to: 'alice',
      amount: 50
    })
  })

  it('should handle complex multi-person debts', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'alice', amount: '40.00' },
      { userId: 'bob', amount: '40.00' },
      { userId: 'charlie', amount: '20.00' }
    ]
    
    const payments: ExpensePayment[] = [
      { userId: 'alice', amount: '100.00' }
    ]
    
    const result = calculateDebts(splits, payments)
    
    expect(result).toHaveLength(2)
    expect(result.find(debt => debt.from === 'bob')).toEqual({
      from: 'bob',
      to: 'alice',
      amount: 40
    })
    expect(result.find(debt => debt.from === 'charlie')).toEqual({
      from: 'charlie',
      to: 'alice',
      amount: 20
    })
  })

  it('should handle no debts when everyone pays their share', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'alice', amount: '50.00' },
      { userId: 'bob', amount: '50.00' }
    ]
    
    const payments: ExpensePayment[] = [
      { userId: 'alice', amount: '50.00' },
      { userId: 'bob', amount: '50.00' }
    ]
    
    const result = calculateDebts(splits, payments)
    expect(result).toHaveLength(0)
  })

  it('should handle multiple creditors', () => {
    const splits: ExpenseSplit[] = [
      { userId: 'alice', amount: '25.00' },
      { userId: 'bob', amount: '25.00' },
      { userId: 'charlie', amount: '25.00' },
      { userId: 'dave', amount: '25.00' }
    ]
    
    const payments: ExpensePayment[] = [
      { userId: 'alice', amount: '50.00' },
      { userId: 'bob', amount: '50.00' }
    ]
    
    const result = calculateDebts(splits, payments)
    
    expect(result).toHaveLength(2)
    expect(result.find(debt => debt.from === 'charlie')).toBeDefined()
    expect(result.find(debt => debt.from === 'dave')).toBeDefined()
  })
})

describe('describeExpenseChange', () => {
  const mockGetUserName = (userId: string) => {
    if (userId === 'user1') return 'Alice'
    if (userId === 'user2') return 'Bob'
    if (userId === 'user_123') return 'David Lee'
    return userId
  }

  it('should return null for identical values', () => {
    expect(describeExpenseChange('title', 'Test', 'Test')).toBeNull()
    expect(describeExpenseChange('amount', '100', '100')).toBeNull()
    expect(describeExpenseChange('splitMode', 'equal', 'equal')).toBeNull()
  })

  it('should describe title changes', () => {
    const result = describeExpenseChange('title', 'Old Title', 'New Title')
    expect(result).toBe('Title changed from "Old Title" to "New Title"')
  })

  it('should describe amount changes', () => {
    const result = describeExpenseChange('amount', '100', '150')
    expect(result).toBe('Amount changed from 100 to 150')
  })

  it('should describe split mode changes', () => {
    const result = describeExpenseChange('splitMode', 'equal', 'percentage')
    expect(result).toBe('Split method changed from equal split to percentage split')
  })

  it('should describe payment mode changes', () => {
    const result = describeExpenseChange('paymentMode', 'single', 'custom')
    expect(result).toBe('Payment method changed from single payer to custom payments')
  })

  it('should handle empty descriptions', () => {
    const result = describeExpenseChange('description', '', 'New description')
    expect(result).toBe('Description changed from empty to New description')
  })

  it('should handle empty categories', () => {
    const result = describeExpenseChange('category', null, 'Food')
    expect(result).toBe('Category changed from none to Food')
  })

  it('should describe split changes with user names', () => {
    const beforeSplits = [{ userId: 'user1', amount: '50' }]
    const afterSplits = [{ userId: 'user1', amount: '30' }, { userId: 'user2', amount: '70' }]
    
    const result = describeExpenseChange('splits', beforeSplits, afterSplits, mockGetUserName)
    expect(result).toBe('Splits changed from Alice: 50 to Alice: 30, Bob: 70')
  })

  it('should describe payment changes with user names', () => {
    const beforePayments = [{ userId: 'user1', amount: '100' }]
    const afterPayments = [{ userId: 'user1', amount: '60' }, { userId: 'user2', amount: '40' }]
    
    const result = describeExpenseChange('payments', beforePayments, afterPayments, mockGetUserName)
    expect(result).toBe('Payments changed from Alice: 100 to Alice: 60, Bob: 40')
  })

  it('should handle percentage splits', () => {
    const beforeSplits = [{ userId: 'user1', percentage: 100 }]
    const afterSplits = [{ userId: 'user1', percentage: 60 }, { userId: 'user2', percentage: 40 }]
    
    const result = describeExpenseChange('splits', beforeSplits, afterSplits, mockGetUserName)
    expect(result).toBe('Splits changed from Alice: 100% to Alice: 60%, Bob: 40%')
  })

  it('should return null for identical arrays', () => {
    const splits = [{ userId: 'user1', amount: '50' }]
    expect(describeExpenseChange('splits', splits, splits)).toBeNull()
  })

  it('should return null for identical splits with different object references', () => {
    const beforeSplits = [{ userId: 'user1', amount: '50' }, { userId: 'user2', amount: '30' }]
    const afterSplits = [{ userId: 'user1', amount: '50' }, { userId: 'user2', amount: '30' }]
    expect(describeExpenseChange('splits', beforeSplits, afterSplits)).toBeNull()
  })

  it('should handle unknown fields', () => {
    const result = describeExpenseChange('customField', 'old', 'new')
    expect(result).toBe('CustomField changed from old to new')
  })

  it('should work without user name function', () => {
    const beforeSplits = [{ userId: 'alice@example.com', amount: '50' }]
    const afterSplits = [{ userId: 'alice@example.com', amount: '30' }, { userId: 'bob@example.com', amount: '70' }]
    
    const result = describeExpenseChange('splits', beforeSplits, afterSplits)
    expect(result).toBe('Splits changed from alice: 50 to alice: 30, bob: 70')
  })
})

describe('formatRelativeTime', () => {
  let mockDate: Date

  beforeEach(() => {
    // Mock the current time to January 15, 2024, 12:00:00 PM UTC
    mockDate = new Date('2024-01-15T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('past dates', () => {
    it('should format seconds ago', () => {
      const date = new Date('2024-01-15T11:59:30.000Z') // 30 seconds ago
      expect(formatRelativeTime(date)).toBe('a few seconds ago')
      
      const dateOne = new Date('2024-01-15T11:59:59.000Z') // 1 second ago
      expect(formatRelativeTime(dateOne)).toBe('a few seconds ago')
    })

    it('should format minutes ago', () => {
      const date = new Date('2024-01-15T11:55:00.000Z') // 5 minutes ago
      expect(formatRelativeTime(date)).toBe('5 minutes ago')
      
      const dateOne = new Date('2024-01-15T11:59:00.000Z') // 1 minute ago
      expect(formatRelativeTime(dateOne)).toBe('a minute ago')
    })

    it('should format hours ago', () => {
      const date = new Date('2024-01-15T09:00:00.000Z') // 3 hours ago
      expect(formatRelativeTime(date)).toBe('3 hours ago')
      
      const dateOne = new Date('2024-01-15T11:00:00.000Z') // 1 hour ago
      expect(formatRelativeTime(dateOne)).toBe('an hour ago')
    })

    it('should format days ago', () => {
      const date = new Date('2024-01-12T12:00:00.000Z') // 3 days ago
      expect(formatRelativeTime(date)).toBe('3 days ago')
      
      const dateOne = new Date('2024-01-14T12:00:00.000Z') // 1 day ago
      expect(formatRelativeTime(dateOne)).toBe('a day ago')
    })

    it('should format weeks ago', () => {
      const date = new Date('2024-01-01T12:00:00.000Z') // 2 weeks ago
      expect(formatRelativeTime(date)).toBe('14 days ago')
      
      const dateOne = new Date('2024-01-08T12:00:00.000Z') // 1 week ago
      expect(formatRelativeTime(dateOne)).toBe('7 days ago')
    })

    it('should format months ago', () => {
      const date = new Date('2023-10-15T12:00:00.000Z') // ~3 months ago
      expect(formatRelativeTime(date)).toBe('3 months ago')
      
      const dateOne = new Date('2023-12-15T12:00:00.000Z') // ~1 month ago
      expect(formatRelativeTime(dateOne)).toBe('a month ago')
    })

    it('should format years ago', () => {
      const date = new Date('2022-01-15T12:00:00.000Z') // 2 years ago
      expect(formatRelativeTime(date)).toBe('2 years ago')
      
      const dateOne = new Date('2023-01-15T12:00:00.000Z') // 1 year ago
      expect(formatRelativeTime(dateOne)).toBe('a year ago')
    })
  })

  describe('future dates', () => {
    it('should format future seconds', () => {
      const date = new Date('2024-01-15T12:00:30.000Z') // 30 seconds from now
      expect(formatRelativeTime(date)).toBe('in a few seconds')
      
      const dateMinutes = new Date('2024-01-15T12:01:00.000Z') // 1 minute from now
      expect(formatRelativeTime(dateMinutes)).toBe('in a minute')
    })

    it('should format future minutes', () => {
      const date = new Date('2024-01-15T12:05:00.000Z') // 5 minutes from now
      expect(formatRelativeTime(date)).toBe('in 5 minutes')
    })

    it('should format future hours', () => {
      const date = new Date('2024-01-15T15:00:00.000Z') // 3 hours from now
      expect(formatRelativeTime(date)).toBe('in 3 hours')
      
      const dateOne = new Date('2024-01-15T13:00:00.000Z') // 1 hour from now
      expect(formatRelativeTime(dateOne)).toBe('in an hour')
    })

    it('should format future days', () => {
      const date = new Date('2024-01-18T12:00:00.000Z') // 3 days from now
      expect(formatRelativeTime(date)).toBe('in 3 days')
      
      const dateOne = new Date('2024-01-16T12:00:00.000Z') // 1 day from now
      expect(formatRelativeTime(dateOne)).toBe('in a day')
    })

    it('should format future weeks', () => {
      const date = new Date('2024-01-29T12:00:00.000Z') // 2 weeks from now
      expect(formatRelativeTime(date)).toBe('in 14 days')
      
      const dateOne = new Date('2024-01-22T12:00:00.000Z') // 1 week from now
      expect(formatRelativeTime(dateOne)).toBe('in 7 days')
    })

    it('should format future months', () => {
      const date = new Date('2024-04-15T12:00:00.000Z') // ~3 months from now
      expect(formatRelativeTime(date)).toBe('in 3 months')
      
      const dateOne = new Date('2024-02-15T12:00:00.000Z') // ~1 month from now
      expect(formatRelativeTime(dateOne)).toBe('in a month')
    })

    it('should format future years', () => {
      const date = new Date('2026-01-15T12:00:00.000Z') // 2 years from now
      expect(formatRelativeTime(date)).toBe('in 2 years')
      
      const dateOne = new Date('2025-01-15T12:00:00.000Z') // 1 year from now
      expect(formatRelativeTime(dateOne)).toBe('in a year')
    })
  })

  describe('edge cases', () => {
    it('should handle "just now" for current time', () => {
      const now = new Date('2024-01-15T12:00:00.000Z')
      expect(formatRelativeTime(now)).toBe('a few seconds ago')
    })

    it('should handle string dates', () => {
      const dateString = '2024-01-14T12:00:00.000Z' // 1 day ago
      expect(formatRelativeTime(dateString)).toBe('a day ago')
    })

    it('should handle timestamp numbers', () => {
      const timestamp = new Date('2024-01-14T12:00:00.000Z').getTime() // 1 day ago
      expect(formatRelativeTime(timestamp)).toBe('a day ago')
    })

    it('should handle invalid dates', () => {
      expect(formatRelativeTime('invalid-date')).toBe('Invalid date')
      expect(formatRelativeTime(NaN)).toBe('Invalid date')
    })

    it('should handle very small differences', () => {
      const almostNow = new Date('2024-01-15T12:00:00.100Z') // 100ms in future
      expect(formatRelativeTime(almostNow)).toBe('in a few seconds')
      
      const justPast = new Date('2024-01-15T11:59:59.900Z') // 100ms ago
      expect(formatRelativeTime(justPast)).toBe('a few seconds ago')
    })
  })
})

describe('parseExpenseCategory', () => {
  describe('Transportation', () => {
    it('should categorize ride sharing services', () => {
      expect(parseExpenseCategory('Uber ride to airport')).toBe('Transportation')
      expect(parseExpenseCategory('Lyft downtown')).toBe('Transportation')
      expect(parseExpenseCategory('Taxi from hotel')).toBe('Transportation')
      expect(parseExpenseCategory('Cab fare')).toBe('Transportation')
    })

    it('should categorize public transport', () => {
      expect(parseExpenseCategory('Metro card')).toBe('Transportation')
      expect(parseExpenseCategory('Bus ticket')).toBe('Transportation')
      expect(parseExpenseCategory('Train to NYC')).toBe('Transportation')
      expect(parseExpenseCategory('Subway ride')).toBe('Transportation')
    })

    it('should categorize car-related expenses', () => {
      expect(parseExpenseCategory('Gas station fill up')).toBe('Transportation')
      expect(parseExpenseCategory('Parking fee')).toBe('Transportation')
      expect(parseExpenseCategory('Toll road')).toBe('Transportation')
      expect(parseExpenseCategory('Rental car')).toBe('Transportation')
    })

    it('should categorize flights', () => {
      expect(parseExpenseCategory('Flight to LA')).toBe('Transportation')
      expect(parseExpenseCategory('Airplane ticket')).toBe('Transportation')
      expect(parseExpenseCategory('Airport shuttle')).toBe('Transportation')
    })
  })

  describe('Food & Dining', () => {
    it('should categorize restaurants and fast food', () => {
      expect(parseExpenseCategory('McDonald lunch')).toBe('Food & Dining')
      expect(parseExpenseCategory('Starbucks coffee')).toBe('Food & Dining')
      expect(parseExpenseCategory('Pizza delivery')).toBe('Food & Dining')
      expect(parseExpenseCategory('Restaurant dinner')).toBe('Food & Dining')
    })

    it('should categorize grocery shopping', () => {
      expect(parseExpenseCategory('Whole Foods grocery')).toBe('Food & Dining')
      expect(parseExpenseCategory('Supermarket shopping')).toBe('Food & Dining')
      expect(parseExpenseCategory('Trader Joe supplies')).toBe('Food & Dining')
    })

    it('should categorize meals', () => {
      expect(parseExpenseCategory('Lunch meeting')).toBe('Food & Dining')
      expect(parseExpenseCategory('Breakfast at cafe')).toBe('Food & Dining')
      expect(parseExpenseCategory('Dinner with friends')).toBe('Food & Dining')
    })
  })

  describe('Shopping', () => {
    it('should categorize online shopping', () => {
      expect(parseExpenseCategory('Amazon purchase')).toBe('Shopping')
      expect(parseExpenseCategory('Target shopping')).toBe('Shopping')
      expect(parseExpenseCategory('Best Buy electronics')).toBe('Shopping')
    })

    it('should categorize clothing and accessories', () => {
      expect(parseExpenseCategory('New shoes')).toBe('Shopping')
      expect(parseExpenseCategory('Clothing store')).toBe('Shopping')
      expect(parseExpenseCategory('Mall shopping')).toBe('Shopping')
    })
  })

  describe('Entertainment', () => {
    it('should categorize streaming services', () => {
      expect(parseExpenseCategory('Netflix subscription')).toBe('Entertainment')
      expect(parseExpenseCategory('Spotify premium')).toBe('Entertainment')
      expect(parseExpenseCategory('Disney Plus')).toBe('Entertainment')
    })

    it('should categorize events and activities', () => {
      expect(parseExpenseCategory('Movie ticket')).toBe('Entertainment')
      expect(parseExpenseCategory('Concert ticket')).toBe('Entertainment')
      expect(parseExpenseCategory('Theater show')).toBe('Entertainment')
      expect(parseExpenseCategory('Game purchase')).toBe('Entertainment')
    })
  })

  describe('Health & Medical', () => {
    it('should categorize medical appointments', () => {
      expect(parseExpenseCategory('Doctor visit')).toBe('Health & Medical')
      expect(parseExpenseCategory('Dentist appointment')).toBe('Health & Medical')
      expect(parseExpenseCategory('Hospital bill')).toBe('Health & Medical')
    })

    it('should categorize pharmacy purchases', () => {
      expect(parseExpenseCategory('CVS prescription')).toBe('Health & Medical')
      expect(parseExpenseCategory('Walgreens medicine')).toBe('Health & Medical')
      expect(parseExpenseCategory('Pharmacy pickup')).toBe('Health & Medical')
    })
  })

  describe('Utilities', () => {
    it('should categorize utility bills', () => {
      expect(parseExpenseCategory('Electric bill')).toBe('Utilities')
      expect(parseExpenseCategory('Water utility')).toBe('Utilities')
      expect(parseExpenseCategory('Internet bill')).toBe('Utilities')
      expect(parseExpenseCategory('Phone bill')).toBe('Utilities')
    })

    it('should categorize service providers', () => {
      expect(parseExpenseCategory('Comcast cable')).toBe('Utilities')
      expect(parseExpenseCategory('Verizon wireless')).toBe('Utilities')
      expect(parseExpenseCategory('ATT service')).toBe('Utilities')
    })
  })

  describe('Home & Garden', () => {
    it('should categorize home improvement stores', () => {
      expect(parseExpenseCategory('Home Depot supplies')).toBe('Home & Garden')
      expect(parseExpenseCategory('Lowes materials')).toBe('Home & Garden')
      expect(parseExpenseCategory('IKEA furniture')).toBe('Home & Garden')
    })

    it('should categorize maintenance and repairs', () => {
      expect(parseExpenseCategory('Home repair')).toBe('Home & Garden')
      expect(parseExpenseCategory('Garden supplies')).toBe('Home & Garden')
      expect(parseExpenseCategory('Cleaning supplies')).toBe('Home & Garden')
    })
  })

  describe('Travel', () => {
    it('should categorize accommodation', () => {
      expect(parseExpenseCategory('Hotel booking')).toBe('Travel')
      expect(parseExpenseCategory('Airbnb stay')).toBe('Travel')
      expect(parseExpenseCategory('Resort vacation')).toBe('Travel')
    })

    it('should categorize travel planning', () => {
      expect(parseExpenseCategory('Expedia booking')).toBe('Travel')
      expect(parseExpenseCategory('Travel insurance')).toBe('Travel')
      expect(parseExpenseCategory('Vacation trip')).toBe('Travel')
    })
  })

  describe('Education', () => {
    it('should categorize educational expenses', () => {
      expect(parseExpenseCategory('University tuition')).toBe('Education')
      expect(parseExpenseCategory('Course enrollment')).toBe('Education')
      expect(parseExpenseCategory('Textbook purchase')).toBe('Education')
      expect(parseExpenseCategory('Training certification')).toBe('Education')
    })
  })

  describe('Personal Care', () => {
    it('should categorize beauty and wellness', () => {
      expect(parseExpenseCategory('Hair salon')).toBe('Personal Care')
      expect(parseExpenseCategory('Spa treatment')).toBe('Personal Care')
      expect(parseExpenseCategory('Gym membership')).toBe('Personal Care')
      expect(parseExpenseCategory('Massage therapy')).toBe('Personal Care')
    })
  })

  describe('Edge cases', () => {
    it('should handle case insensitive matching', () => {
      expect(parseExpenseCategory('UBER RIDE')).toBe('Transportation')
      expect(parseExpenseCategory('uber ride')).toBe('Transportation')
      expect(parseExpenseCategory('Uber Ride')).toBe('Transportation')
    })

    it('should prioritize more specific keywords', () => {
      // "subway sandwich" should match Food & Dining, not Transportation
      expect(parseExpenseCategory('Subway sandwich lunch')).toBe('Food & Dining')
    })

    it('should use description when provided', () => {
      expect(parseExpenseCategory('Random title', 'Went to Starbucks for coffee')).toBe('Food & Dining')
      expect(parseExpenseCategory('Expense', 'Uber ride to work')).toBe('Transportation')
    })

    it('should return null for unrecognized expenses', () => {
      expect(parseExpenseCategory('Random expense')).toBeNull()
      expect(parseExpenseCategory('Unknown category')).toBeNull()
      expect(parseExpenseCategory('')).toBeNull()
    })

    it('should find keywords within longer text', () => {
      expect(parseExpenseCategory('Bought some electronics at Best Buy today')).toBe('Shopping')
      expect(parseExpenseCategory('Had a great meal at the restaurant downtown')).toBe('Food & Dining')
    })
  })
})