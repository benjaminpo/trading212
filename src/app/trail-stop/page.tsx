'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, TrendingDown, AlertTriangle, CheckCircle, XCircle, Trash2, Activity } from 'lucide-react'
import Link from 'next/link'
import ClientWrapper from '@/components/client-wrapper'
import AccountSelector from '@/components/account-selector'
import { ThemeToggle } from '@/components/theme-toggle'

interface TrailStopOrder {
  id: string
  symbol: string
  quantity: number
  trailAmount: number
  trailPercent?: number
  stopPrice?: number
  isActive: boolean
  isPractice: boolean
  createdAt: string
  updatedAt: string
}

interface Position {
  ticker: string
  quantity: number
  currentPrice: number
  marketValue: number
  ppl: number
  pplPercent: number
}

export default function TrailStopPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<TrailStopOrder[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    symbol: '',
    quantity: '',
    trailAmount: '',
    trailPercent: '',
    trailType: 'amount' // 'amount' or 'percent'
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      setLoading(true)
      
      // Load trail stop orders
      const ordersResponse = await fetch('/api/trail-stop/orders')
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setOrders(ordersData.orders || [])
      }

      // Load current positions for the form
      const portfolioUrl = selectedAccountId 
        ? `/api/trading212/optimized/portfolio?accountId=${selectedAccountId}`
        : '/api/trading212/optimized/portfolio'
      const portfolioResponse = await fetch(portfolioUrl)
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setPositions(portfolioData.positions || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [selectedAccountId])

  useEffect(() => {
    if (!mounted || status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    const loadDataAsync = async () => {
      try {
        setLoading(true)
        
        // Load trail stop orders
        const ordersResponse = await fetch('/api/trail-stop/orders')
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          setOrders(ordersData.orders || [])
        }

        // Load current positions for the form
        const portfolioUrl = selectedAccountId 
          ? `/api/trading212/portfolio?accountId=${selectedAccountId}`
          : '/api/trading212/portfolio'
        const portfolioResponse = await fetch(portfolioUrl)
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json()
          setPositions(portfolioData.positions || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadDataAsync()
  }, [mounted, session, status, router, selectedAccountId])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.symbol || !formData.quantity) return

    setSubmitting(true)
    try {
      // Determine if this is a practice account based on selected account
      let isPractice = false
      if (selectedAccountId) {
        // Get account info to determine practice mode
        const accountsResponse = await fetch('/api/trading212/optimized/accounts')
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          const selectedAccount = accountsData.accounts?.find((acc: { id: string; isPractice: boolean }) => acc.id === selectedAccountId)
          isPractice = selectedAccount?.isPractice || false
        }
      }

      const orderData = {
        symbol: formData.symbol,
        quantity: parseFloat(formData.quantity),
        ...(formData.trailType === 'amount' 
          ? { trailAmount: parseFloat(formData.trailAmount) }
          : { trailPercent: parseFloat(formData.trailPercent) }
        ),
        isPractice,
        accountId: selectedAccountId // Pass the account ID for reference
      }

      const response = await fetch('/api/trail-stop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        await loadData()
        setFormData({
          symbol: '',
          quantity: '',
          trailAmount: '',
          trailPercent: '',
          trailType: 'amount'
        })
        setShowCreateForm(false)
        
        const message = isPractice 
          ? 'Trail stop order created successfully! It will be executed automatically when triggered.'
          : 'Trail stop order created successfully! You will receive notifications when it triggers - then manually execute the trade in Trading212.'
        alert(message)
      } else {
        const error = await response.json()
        alert(`Failed to create order: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error creating trail stop order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this trail stop order?')) return

    try {
      const response = await fetch(`/api/trail-stop/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
        alert('Trail stop order deleted successfully!')
      } else {
        alert('Failed to delete order')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error deleting trail stop order')
    }
  }

  const handleToggleOrder = async (orderId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/trail-stop/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        await loadData()
      } else {
        alert('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Error updating trail stop order')
    }
  }

  const handleAccountChange = (accountId: string | null) => {
    setSelectedAccountId(accountId)
    setLoading(true)
  }

  if (!mounted || status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const activeOrders = orders.filter(order => order.isActive)
  const inactiveOrders = orders.filter(order => !order.isActive)

  return (
    <ClientWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm dark:shadow-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="mr-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Trail Stop Orders</h1>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                      <Activity className="h-3 w-3 mr-1" />
                      Auto-Execute (Practice) / Notify (Live)
                    </Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">Automated stop-loss orders that trail the market price</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Account:</span>
                  <AccountSelector 
                    selectedAccountId={selectedAccountId || undefined}
                    onAccountChange={handleAccountChange}
                    className="w-48"
                  />
                </div>
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            
            {/* Create Order Form */}
            {showCreateForm && (
              <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-900 dark:text-slate-50">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-green-500/20">
                      <Plus className="h-4 w-4 text-white" />
                    </div>
                    Create Trail Stop Order
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-300">
                    Set up an automated stop-loss that follows the market price
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="trail-symbol" className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          Symbol
                        </label>
                        <select
                          id="trail-symbol"
                          value={formData.symbol}
                          onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                          required
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select a position</option>
                          {positions.map((position) => (
                            <option key={position.ticker} value={position.ticker}>
                              {position.ticker} ({position.quantity} shares @ ${position.currentPrice.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="trail-quantity" className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          Quantity
                        </label>
                        <Input
                          id="trail-quantity"
                          type="number"
                          step="any"
                          min="0"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          placeholder="Number of shares (e.g., 91.20073327)"
                          required
                          className="bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        Trail Type
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="amount"
                            checked={formData.trailType === 'amount'}
                            onChange={(e) => setFormData({...formData, trailType: e.target.value})}
                            className="mr-2"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Fixed Amount ($)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="percent"
                            checked={formData.trailType === 'percent'}
                            onChange={(e) => setFormData({...formData, trailType: e.target.value})}
                            className="mr-2"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Percentage (%)</span>
                        </label>
                      </div>
                    </div>

                    {formData.trailType === 'amount' ? (
                      <div>
                        <label htmlFor="trail-amount" className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          Trail Amount ($)
                        </label>
                        <Input
                          id="trail-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.trailAmount}
                          onChange={(e) => setFormData({...formData, trailAmount: e.target.value})}
                          placeholder="e.g., 5.00"
                          required
                          className="bg-white dark:bg-slate-800"
                        />
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Stop price will trail $X behind the highest price
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="trail-percent" className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                          Trail Percentage (%)
                        </label>
                        <Input
                          id="trail-percent"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.trailPercent}
                          onChange={(e) => setFormData({...formData, trailPercent: e.target.value})}
                          placeholder="e.g., 5.0"
                          required
                          className="bg-white dark:bg-slate-800"
                        />
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Stop price will trail X% behind the highest price
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200">How Trail Stops Work</h4>
                          <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-2">
                            <div>
                              <strong>Practice Accounts:</strong>
                              <ul className="ml-4 space-y-1">
                                <li>• Orders are executed automatically by our system</li>
                                <li>• Market sell orders placed when triggered</li>
                              </ul>
                            </div>
                            <div>
                              <strong>Live/Production Accounts:</strong>
                              <ul className="ml-4 space-y-1">
                                <li>• Orders trigger notifications to alert you</li>
                                <li>• You manually place the sell order in Trading212</li>
                                <li>• Email/app notifications when stop price is hit</li>
                              </ul>
                            </div>
                            <div>
                              <strong>General:</strong>
                              <ul className="ml-4 space-y-1">
                                <li>• Stop price adjusts only when market moves favorably</li>
                                <li>• Orders are monitored continuously during market hours</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
                        {submitting ? 'Creating...' : 'Create Trail Stop Order'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Orders Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Active Orders</CardTitle>
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {activeOrders.length}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Currently monitoring
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Inactive Orders</CardTitle>
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/20">
                    <XCircle className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                    {inactiveOrders.length}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Paused or stopped
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">Total Orders</CardTitle>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {orders.length}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    All trail stops
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Orders List */}
            <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-50">Trail Stop Orders</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Manage your automated stop-loss orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingDown className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No trail stop orders</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Create your first automated stop-loss order to protect your positions.
                    </p>
                    <Button onClick={() => setShowCreateForm(true)} className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Order
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className={`border rounded-lg p-4 ${order.isActive ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{order.symbol}</h3>
                                <Badge variant={order.isActive ? 'default' : 'secondary'}>
                                  {order.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge className={order.isPractice 
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                }>
                                  {order.isPractice ? 'Practice' : 'Live'}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {order.quantity} shares • Trail: {order.trailPercent ? `${order.trailPercent}%` : `$${order.trailAmount}`}
                                {order.stopPrice && ` • Stop: $${order.stopPrice.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                Created: {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleOrder(order.id, order.isActive)}
                              className={order.isActive ? 'text-orange-600 border-orange-300' : 'text-green-600 border-green-300'}
                            >
                              {order.isActive ? 'Pause' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="border border-blue-200/50 dark:border-blue-800/30 shadow-lg bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  How Trail Stop Orders Work
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 dark:text-blue-200 space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Trail Stop Logic:</h4>
                  <p className="text-sm">A trail stop order automatically adjusts the stop price as the market price moves in your favor, helping lock in profits while limiting losses.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Example:</h4>
                  <p className="text-sm">Stock at $100, trail amount $5 → Stop price starts at $95. If stock rises to $110, stop price adjusts to $105. If stock falls to $105, order triggers.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Account Mode Behavior:</h4>
                  <p className="text-sm"><strong>Practice:</strong> Orders executed automatically. <strong>Live:</strong> Notifications sent when triggered - you manually execute the trade in Trading212.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientWrapper>
  )
}
