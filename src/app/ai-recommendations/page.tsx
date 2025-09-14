'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Brain, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, ThumbsUp, ThumbsDown, Info, Clock, User } from 'lucide-react'
import Link from 'next/link'
import ClientWrapper from '@/components/client-wrapper'
import AccountSelector from '@/components/account-selector'
import { ThemeToggle } from '@/components/theme-toggle'

interface AIRecommendation {
  id: string
  symbol: string
  recommendationType: 'EXIT' | 'HOLD' | 'REDUCE' | 'INCREASE'
  confidence: number
  reasoning: string
  suggestedAction: string
  targetPrice?: number
  stopLoss?: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG'
  createdAt: string
  position: {
    symbol: string
    quantity: number
    currentPrice: number
    pnl: number
    pnlPercent: number
    averagePrice: number
  }
  accountInfo?: {
    name: string
    isPractice: boolean
    isDefault: boolean
  }
}

export default function AIRecommendationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{name: string, isPractice: boolean, isAggregated?: boolean} | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)


  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchRecommendations = useCallback(async () => {
    try {
      const url = selectedAccountId 
        ? `/api/ai/analyze-positions?accountId=${selectedAccountId}`
        : '/api/ai/analyze-positions'
      
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 AI Recommendations data:', data.recommendations?.map((rec: AIRecommendation) => ({
          symbol: rec.symbol,
          pnlPercent: rec.position?.pnlPercent,
          averagePrice: rec.position?.averagePrice,
          currentPrice: rec.position?.currentPrice,
          pnl: rec.position?.pnl
        })))
        setRecommendations(data.recommendations || [])
        
        // Set account info if available in response
        if (data.accountInfo) {
          setAccountInfo({
            name: data.accountInfo.name,
            isPractice: data.accountInfo.isPractice,
            isAggregated: data.accountInfo.isAggregated
          })
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    if (!mounted || status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchRecommendations()
  }, [mounted, session, status, router, fetchRecommendations])

  const handleAccountChange = (accountId: string | null) => {
    setSelectedAccountId(accountId)
    setLoading(true)
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          analysisType: 'ON_DEMAND',
          accountId: selectedAccountId 
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setRecommendations(data.recommendations || [])
        
        // Set account info if available in response
        if (data.accountInfo) {
          setAccountInfo({
            name: data.accountInfo.name,
            isPractice: data.accountInfo.isPractice
          })
        }
        
        alert(`Analysis completed! Generated ${data.recommendations?.length || 0} recommendations in ${data.executionTime}ms`)
      } else {
        alert(data.error || 'Failed to run analysis')
      }
    } catch {
      alert('Error running analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'EXIT':
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case 'INCREASE':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'REDUCE':
        return <TrendingDown className="h-5 w-5 text-orange-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-600" />
    }
  }

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'EXIT':
        return 'border-red-200/60 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm shadow-lg dark:shadow-red-900/10'
      case 'INCREASE':
        return 'border-green-200/60 dark:border-green-800/60 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm shadow-lg dark:shadow-green-900/10'
      case 'REDUCE':
        return 'border-orange-200/60 dark:border-orange-800/60 bg-orange-50/80 dark:bg-orange-900/20 backdrop-blur-sm shadow-lg dark:shadow-orange-900/10'
      default:
        return 'border-blue-200/60 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm shadow-lg dark:shadow-blue-900/10'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return 'status-error'
      case 'MEDIUM':
        return 'status-warning'
      default:
        return 'status-active'
    }
  }

  if (!mounted || status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ClientWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-lg dark:shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 flex items-center">
                  <Brain className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                  AI Recommendations
                </h1>
                <p className="text-gray-600 dark:text-slate-300">AI-powered exit strategy suggestions for your positions</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <AccountSelector 
                selectedAccountId={selectedAccountId || undefined}
                onAccountChange={handleAccountChange}
              />
              <ThemeToggle />
              <Button 
                onClick={runAnalysis} 
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Disclaimer */}
        <Card className="mb-6 bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200/60 dark:border-yellow-800/60 backdrop-blur-sm shadow-lg dark:shadow-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">AI Recommendations Disclaimer</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                  These AI-powered recommendations are for informational purposes only and should not be considered as financial advice. 
                  The AI analysis is based on historical data, current market conditions, and position performance, but cannot predict future market movements with certainty. 
                  Always conduct your own research, consider your risk tolerance, and consult with a qualified financial advisor before making investment decisions. 
                  Past performance does not guarantee future results. You are solely responsible for your trading decisions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        {accountInfo && (
          <Card className="mb-6 bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 backdrop-blur-sm shadow-lg dark:shadow-blue-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                    {accountInfo.isAggregated ? 'Viewing' : 'Account'}: {accountInfo.name}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {accountInfo.isAggregated 
                      ? 'Aggregated view across all accounts' 
                      : (accountInfo.isPractice ? 'Practice Account' : 'Live Trading Account')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {recommendations.length === 0 ? (
          <Card className="text-center py-12 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-gray-200/50 dark:border-slate-700/50 shadow-xl dark:shadow-slate-900/20">
            <CardContent>
              <Brain className="h-16 w-16 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">No AI Recommendations Yet</h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Run an AI analysis to get personalized exit strategy recommendations for your positions.
              </p>
              <Button 
                onClick={runAnalysis} 
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Brain className="h-4 w-4 mr-2" />
                {analyzing ? 'Analyzing...' : 'Start AI Analysis'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-gray-200/50 dark:border-slate-700/50 shadow-xl dark:shadow-slate-900/20">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-slate-100">Analysis Summary</CardTitle>
                <CardDescription className="text-gray-600 dark:text-slate-300">
                  Latest AI analysis results for your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {recommendations.filter(r => r.recommendationType === 'EXIT').length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">Exit Recommendations</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/30">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {recommendations.filter(r => r.recommendationType === 'HOLD').length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">Hold Recommendations</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200/50 dark:border-orange-800/30">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {recommendations.filter(r => r.recommendationType === 'REDUCE').length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">Reduce Recommendations</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {recommendations.filter(r => r.recommendationType === 'INCREASE').length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-300">Increase Recommendations</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations List */}
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <Card key={rec.id} className={`${getRecommendationColor(rec.recommendationType)} border-l-4 transition-all duration-200 hover:shadow-xl dark:hover:shadow-slate-900/20`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-gray-900 dark:text-slate-100">
                        {getRecommendationIcon(rec.recommendationType)}
                        <span className="ml-2">{rec.symbol}</span>
                        <span className="ml-4 text-lg font-bold">
                          {rec.recommendationType}
                        </span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(rec.riskLevel)}`}>
                          {rec.riskLevel} Risk
                        </span>
                        <span className="text-sm text-gray-600 dark:text-slate-300">
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Position Info */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-slate-700/50">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Quantity</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{rec.position.quantity}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Avg Price</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">${rec.position.averagePrice?.toFixed(2) || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">Current Price</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">${rec.position.currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">P/L</div>
                        <div className={`font-semibold ${rec.position.pnl >= 0 ? 'profit' : 'loss'}`}>
                          ${rec.position.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-slate-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Hold Time
                        </div>
                        <div className="font-semibold text-gray-500 dark:text-slate-400 text-xs">
                          Not Available
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          Purchase date not provided by Trading212 API
                        </div>
                      </div>
                    </div>

                    {/* P/L Percentage - Full width for better visibility */}
                    <div className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-slate-700/50">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total P/L Percentage</div>
                        <div className={`text-2xl font-bold ${rec.position.pnlPercent >= 0 ? 'profit' : 'loss'}`}>
                          {rec.position.pnlPercent >= 0 ? '+' : ''}{rec.position.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {/* Account Info (for aggregated view) */}
                    {rec.accountInfo && accountInfo?.isAggregated && (
                      <div className="p-3 bg-gray-50/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{rec.accountInfo.name}</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({rec.accountInfo.isPractice ? 'Practice' : 'Live'})
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">AI Analysis</h4>
                      <p className="text-gray-700 dark:text-slate-300 mb-3">{rec.reasoning}</p>
                    </div>

                    {/* Suggested Action */}
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100">Suggested Action</h4>
                      <p className="text-gray-700 dark:text-slate-300 mb-3">{rec.suggestedAction}</p>
                    </div>

                    {/* Price Targets */}
                    {(rec.targetPrice || rec.stopLoss) && (
                      <div className="grid grid-cols-2 gap-4">
                        {rec.targetPrice && (
                          <div className="p-3 bg-green-50/80 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/30 backdrop-blur-sm">
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">Target Price</div>
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">${rec.targetPrice.toFixed(2)}</div>
                          </div>
                        )}
                        {rec.stopLoss && (
                          <div className="p-3 bg-red-50/80 dark:bg-red-900/20 rounded-lg border border-red-200/50 dark:border-red-800/30 backdrop-blur-sm">
                            <div className="text-sm text-red-600 dark:text-red-400 font-medium">Stop Loss</div>
                            <div className="text-lg font-bold text-red-700 dark:text-red-300">${rec.stopLoss.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-slate-400">Was this helpful?</span>
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">
                        {new Date(rec.createdAt).toLocaleDateString()} • {rec.timeframe} term
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </ClientWrapper>
  )
}
