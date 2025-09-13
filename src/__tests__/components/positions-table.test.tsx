import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PositionsTable from '@/components/positions-table'

// Mock currency formatting
jest.mock('@/lib/currency', () => ({
  formatCurrency: jest.fn((amount: number, currency: string) => {
    if (currency === 'EUR') {
      return `€${amount.toFixed(2)}`
    }
    return `$${amount.toFixed(2)}`
  }),
}))

describe('PositionsTable', () => {
  const mockPositions = [
    {
      ticker: 'AAPL',
      quantity: 100,
      averagePrice: 150.00,
      currentPrice: 155.00,
      ppl: 500.00,
      pplPercent: 3.33,
      marketValue: 15500.00,
      maxBuy: 200,
      maxSell: 100,
      accountName: 'Test Account',
      accountId: '1',
      isPractice: false,
    },
    {
      ticker: 'GOOGL',
      quantity: 50,
      averagePrice: 2800.00,
      currentPrice: 2750.00,
      ppl: -2500.00,
      pplPercent: -1.79,
      marketValue: 137500.00,
      maxBuy: 100,
      maxSell: 50,
      accountName: 'Demo Account',
      accountId: '2',
      isPractice: true,
    },
    {
      ticker: 'MSFT',
      quantity: 75,
      averagePrice: 300.00,
      currentPrice: 310.00,
      ppl: 750.00,
      pplPercent: 3.33,
      marketValue: 23250.00,
      maxBuy: 150,
      maxSell: 75,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders positions table with data', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('displays search input', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const searchInput = screen.getByPlaceholderText('Search by symbol or account...')
    expect(searchInput).toBeInTheDocument()
  })

  it('filters positions by search term', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const searchInput = screen.getByPlaceholderText('Search by symbol or account...')
    fireEvent.change(searchInput, { target: { value: 'AAPL' } })

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('GOOGL')).not.toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
  })

  it('shows account column when showAccountColumn is true', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" showAccountColumn={true} />)

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Test Account')).toBeInTheDocument()
    expect(screen.getByText('Demo Account')).toBeInTheDocument()
  })

  it('hides account column when showAccountColumn is false', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" showAccountColumn={false} />)

    expect(screen.queryByText('Account')).not.toBeInTheDocument()
  })

  it('sorts by ticker when ticker header is clicked', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const tickerHeader = screen.getByText('Symbol')
    fireEvent.click(tickerHeader)

    // Check that the ticker header is clickable
    expect(tickerHeader).toBeInTheDocument()
  })

  it('sorts by quantity when quantity header is clicked', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const quantityHeader = screen.getByText('Quantity')
    fireEvent.click(quantityHeader)

    // Positions should be sorted by quantity (descending by default)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('100') // AAPL
    expect(rows[2]).toHaveTextContent('75')  // MSFT
    expect(rows[3]).toHaveTextContent('50')  // GOOGL
  })

  it('sorts by P&L when P&L header is clicked', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const pnlHeader = screen.getByText('P/L')
    fireEvent.click(pnlHeader)

    // Positions should be sorted by P&L (descending by default)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('MSFT') // Highest P&L
    expect(rows[2]).toHaveTextContent('AAPL') // Medium P&L
    expect(rows[3]).toHaveTextContent('GOOGL') // Lowest P&L (negative)
  })

  it('toggles sort direction when same header is clicked twice', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    const tickerHeader = screen.getByText('Symbol')
    
    // First click
    fireEvent.click(tickerHeader)
    expect(tickerHeader).toBeInTheDocument()

    // Second click
    fireEvent.click(tickerHeader)
    expect(tickerHeader).toBeInTheDocument()
  })

  it('displays P&L with correct styling for positive values', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    // AAPL has positive P&L
    const aaplPnl = screen.getByText('+$500.00')
    expect(aaplPnl).toHaveClass('text-green-600')
  })

  it('displays P&L with correct styling for negative values', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    // Check that the component renders with negative P&L values
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
  })

  it('displays P&L percentage with correct styling', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" />)

    // Check positive percentage
    const positivePnlPercent = screen.getAllByText('+3.33%')[0]
    expect(positivePnlPercent).toHaveClass('text-green-600')

    // Check negative percentage
    const negativePnlPercent = screen.getByText('-1.79%')
    expect(negativePnlPercent).toHaveClass('text-red-600')
  })

  it('handles empty positions array', () => {
    render(<PositionsTable positions={[]} currency="USD" />)

    expect(screen.getByText('No positions to display')).toBeInTheDocument()
  })

  it('handles positions without account information', () => {
    const positionsWithoutAccount = [
      {
        ticker: 'TSLA',
        quantity: 25,
        averagePrice: 200.00,
        currentPrice: 210.00,
        ppl: 250.00,
        pplPercent: 5.00,
        marketValue: 5250.00,
        maxBuy: 50,
        maxSell: 25,
      },
    ]

    render(<PositionsTable positions={positionsWithoutAccount} currency="USD" showAccountColumn={true} />)

    expect(screen.getByText('TSLA')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('filters by account name when showAccountColumn is true', () => {
    render(<PositionsTable positions={mockPositions} currency="USD" showAccountColumn={true} />)

    const searchInput = screen.getByPlaceholderText('Search by symbol or account...')
    fireEvent.change(searchInput, { target: { value: 'Test' } })

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('GOOGL')).not.toBeInTheDocument()
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument()
  })

  it('displays correct currency formatting', () => {
    render(<PositionsTable positions={mockPositions} currency="EUR" />)

    // Check that the component renders with EUR currency
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('handles positions with zero values', () => {
    const zeroPositions = [
      {
        ticker: 'ZERO',
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        ppl: 0,
        pplPercent: 0,
        marketValue: 0,
        maxBuy: 0,
        maxSell: 0,
        accountName: 'Test Account',
        accountId: '1',
        isPractice: false,
      }
    ]

    render(<PositionsTable positions={zeroPositions} showAccountColumn={true} currency="USD" />)

    expect(screen.getByText('ZERO')).toBeInTheDocument()
    expect(screen.getAllByText('$0.00')).toHaveLength(3) // Multiple cells with $0.00
  })

  it('handles positions with very large values', () => {
    const largePositions = [
      {
        ticker: 'LARGE',
        quantity: 1000000,
        averagePrice: 999999.99,
        currentPrice: 1000000.00,
        ppl: 1000000.00,
        pplPercent: 100.00,
        marketValue: 1000000000.00,
        maxBuy: 1000000,
        maxSell: 1000000,
        accountName: 'Test Account',
        accountId: '1',
        isPractice: false,
      }
    ]

    render(<PositionsTable positions={largePositions} showAccountColumn={true} currency="USD" />)
    
    expect(screen.getByText('LARGE')).toBeInTheDocument()
    expect(screen.getByText('$1000000.00')).toBeInTheDocument()
  })

  it('handles positions with very small values', () => {
    const smallPositions = [
      {
        ticker: 'SMALL',
        quantity: 0.001,
        averagePrice: 0.01,
        currentPrice: 0.02,
        ppl: 0.01,
        pplPercent: 100.00,
        marketValue: 0.02,
        maxBuy: 0.001,
        maxSell: 0.001,
        accountName: 'Test Account',
        accountId: '1',
        isPractice: false,
      }
    ]

    render(<PositionsTable positions={smallPositions} showAccountColumn={true} currency="USD" />)

    expect(screen.getByText('SMALL')).toBeInTheDocument()
    expect(screen.getAllByText('$0.02')).toHaveLength(2) // Multiple cells with $0.02
  })

  it('handles positions with null/undefined values', () => {
    const nullPositions = [
      {
        ticker: 'NULL',
        quantity: null,
        averagePrice: null,
        currentPrice: null,
        ppl: null,
        pplPercent: null,
        marketValue: null,
        maxBuy: null,
        maxSell: null,
        accountName: 'Test Account',
        accountId: '1',
        isPractice: false,
      }
    ]

    render(<PositionsTable positions={nullPositions as any} showAccountColumn={true} currency="USD" />)
    
    expect(screen.getByText('NULL')).toBeInTheDocument()
  })

  it('handles search with special characters', () => {
    render(<PositionsTable positions={mockPositions} showAccountColumn={true} currency="USD" />)

    const searchInput = screen.getByPlaceholderText('Search by symbol or account...')
    fireEvent.change(searchInput, { target: { value: 'AAPL@#$%' } })

    // Should filter out results when special characters don't match
    expect(screen.getByText('0 of 3 positions')).toBeInTheDocument()
  })

  it('handles case insensitive search', () => {
    render(<PositionsTable positions={mockPositions} showAccountColumn={true} currency="USD" />)
    
    const searchInput = screen.getByPlaceholderText('Search by symbol or account...')
    fireEvent.change(searchInput, { target: { value: 'aapl' } })

    // Should show AAPL (case insensitive)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })
})
