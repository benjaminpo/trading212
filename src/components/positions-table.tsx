'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Position {
  ticker: string
  quantity: number
  averagePrice: number
  currentPrice: number
  ppl: number
  pplPercent: number
  marketValue: number
  maxBuy: number
  maxSell: number
  accountName?: string
  accountId?: string
  isPractice?: boolean
}

interface PositionsTableProps {
  positions: Position[]
  currency: string
  showAccountColumn?: boolean
}

type SortField = 'ticker' | 'accountName' | 'quantity' | 'averagePrice' | 'currentPrice' | 'marketValue' | 'ppl' | 'pplPercent'
type SortDirection = 'asc' | 'desc'

export default function PositionsTable({ positions, currency, showAccountColumn = false }: PositionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('marketValue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter and sort positions
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = positions.filter(position => {
      const searchLower = searchTerm.toLowerCase()
      return (
        position.ticker.toLowerCase().includes(searchLower) ||
        (position.accountName && position.accountName.toLowerCase().includes(searchLower))
      )
    })

    // Sort positions
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'ticker':
          aValue = a.ticker.toLowerCase()
          bValue = b.ticker.toLowerCase()
          break
        case 'accountName':
          aValue = (a.accountName || '').toLowerCase()
          bValue = (b.accountName || '').toLowerCase()
          break
        case 'quantity':
          aValue = a.quantity || 0
          bValue = b.quantity || 0
          break
        case 'averagePrice':
          aValue = a.averagePrice || 0
          bValue = b.averagePrice || 0
          break
        case 'currentPrice':
          aValue = a.currentPrice || 0
          bValue = b.currentPrice || 0
          break
        case 'marketValue':
          aValue = a.marketValue || 0
          bValue = b.marketValue || 0
          break
        case 'ppl':
          aValue = a.ppl || 0
          bValue = b.ppl || 0
          break
        case 'pplPercent':
          aValue = a.pplPercent || 0
          bValue = b.pplPercent || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [positions, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-slate-400" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-slate-600 dark:text-slate-300" /> : 
      <ArrowDown className="h-4 w-4 text-slate-600 dark:text-slate-300" />
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by symbol or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {filteredAndSortedPositions.length} of {positions.length} positions
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('ticker')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  Symbol
                  {getSortIcon('ticker')}
                </Button>
              </th>
              {showAccountColumn && (
                <th className="text-left py-3 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('accountName')}
                    className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                  >
                    Account
                    {getSortIcon('accountName')}
                  </Button>
                </th>
              )}
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('quantity')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  Quantity
                  {getSortIcon('quantity')}
                </Button>
              </th>
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('averagePrice')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  Avg Price
                  {getSortIcon('averagePrice')}
                </Button>
              </th>
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('currentPrice')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  Current Price
                  {getSortIcon('currentPrice')}
                </Button>
              </th>
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('marketValue')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  Market Value
                  {getSortIcon('marketValue')}
                </Button>
              </th>
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('ppl')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  P/L
                  {getSortIcon('ppl')}
                </Button>
              </th>
              <th className="text-right py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('pplPercent')}
                  className="h-auto p-0 font-semibold text-slate-900 dark:text-slate-100 hover:bg-transparent"
                >
                  P/L %
                  {getSortIcon('pplPercent')}
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPositions.length > 0 ? filteredAndSortedPositions.map((position, index) => (
              <tr key={`${position.ticker}-${position.accountId || index}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-3 px-2 font-medium text-slate-900 dark:text-slate-100">{position.ticker}</td>
                {showAccountColumn && (
                  <td className="py-3 px-2 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center space-x-2">
                      <span>{position.accountName || 'Unknown'}</span>
                      {position.isPractice && (
                        <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Practice
                        </Badge>
                      )}
                    </div>
                  </td>
                )}
                <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300">{position.quantity || 0}</td>
                <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency(position.averagePrice || 0, currency)}</td>
                <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300">{formatCurrency(position.currentPrice || 0, currency)}</td>
                <td className="py-3 px-2 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(position.marketValue || 0, currency)}</td>
                <td className={`py-3 px-2 text-right font-medium ${(position.ppl || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(position.ppl || 0) >= 0 ? '+' : ''}{formatCurrency(position.ppl || 0, currency)}
                </td>
                <td className={`py-3 px-2 text-right font-medium ${(position.pplPercent || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(position.pplPercent || 0) >= 0 ? '+' : ''}{(position.pplPercent || 0).toFixed(2)}%
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={showAccountColumn ? 8 : 7} className="py-8 text-center text-slate-600 dark:text-slate-400">
                  {searchTerm ? 'No positions match your search' : 'No positions to display'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
