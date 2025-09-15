'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { ChevronDown, Star, AlertCircle, CheckCircle } from 'lucide-react'

interface Trading212Account {
  id: string
  name: string
  isPractice: boolean
  isActive: boolean
  isDefault: boolean
  currency?: string
  cash?: number
  lastConnected?: string
  lastError?: string
  apiKeyPreview?: string
}

interface AccountSelectorProps {
  selectedAccountId?: string
  onAccountChange: (accountId: string | null) => void
  className?: string
}

export default function AccountSelector({ selectedAccountId, onAccountChange, className = '' }: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Trading212Account[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/trading212/optimized/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedAccount = selectedAccountId 
    ? accounts.find(acc => acc.id === selectedAccountId)
    : accounts.find(acc => acc.isDefault) || accounts.find(acc => acc.isActive)

  const handleAccountSelect = (accountId: string) => {
    onAccountChange(accountId)
    setIsOpen(false)
  }

  const handleViewAll = () => {
    onAccountChange(null) // null means view all/aggregated
    setIsOpen(false)
  }

  const handleButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setIsOpen(!isOpen)
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-10 w-48 ${className}`} />
    )
  }

  if (accounts.length === 0) {
    return (
      <div className={`text-sm text-slate-600 dark:text-slate-400 ${className}`}>
        No accounts configured
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={handleButtonClick}
        className="w-full justify-between bg-white/90 dark:bg-slate-800/90 border-slate-200/60 dark:border-slate-600/60 hover:bg-slate-50 dark:hover:bg-slate-700/90 backdrop-blur-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={mounted && isOpen ? 'account-selector-dropdown' : undefined}
      >
        <div className="flex items-center space-x-2">
          {selectedAccountId ? (
            <>
              {selectedAccount?.isDefault && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
              <span className="text-sm font-medium">
                {selectedAccount?.name || 'Unknown Account'}
              </span>
              {selectedAccount?.isPractice && (
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                  Practice
                </span>
              )}
              {selectedAccount?.lastError ? (
                <AlertCircle className="h-3 w-3 text-red-500" />
              ) : selectedAccount?.lastConnected ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : null}
            </>
          ) : (
            <span className="text-sm font-medium">All Accounts</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {/* Portal-based dropdown */}
      {mounted && isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div 
            className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-600/60 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              minWidth: '200px'
            }}
            id="account-selector-dropdown"
            role="listbox"
          >
            {/* All Accounts Option */}
            <button
              onClick={handleViewAll}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center space-x-2 ${
                !selectedAccountId ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300' : ''
              }`}
              role="option"
              aria-selected={!selectedAccountId}
            >
              <span className="font-medium">All Accounts</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">(Aggregated View)</span>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-700" />

            {/* Individual Accounts */}
            {accounts
              .filter(acc => acc.isActive)
              .sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1
                if (!a.isDefault && b.isDefault) return 1
                return a.name.localeCompare(b.name)
              })
              .map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between ${
                    selectedAccountId === account.id ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300' : ''
                  }`}
                  role="option"
                  aria-selected={selectedAccountId === account.id}
                >
                  <div className="flex items-center space-x-2">
                    {account.isDefault && (
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    )}
                    <span className="font-medium">{account.name}</span>
                    {account.isPractice && (
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                        Practice
                      </span>
                    )}
                    {account.currency && account.cash !== null && account.cash !== undefined && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ${account.cash.toFixed(0)} {account.currency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {account.lastError ? (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    ) : account.lastConnected ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : null}
                  </div>
                </button>
              ))}

            {accounts.filter(acc => acc.isActive).length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No active accounts
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
