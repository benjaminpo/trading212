'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Brain, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react'
import Link from 'next/link'
import ClientWrapper from '@/components/client-wrapper'
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
  }
}

export default function AIRecommendationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchRecommendations()
  }, [mounted, session, status, router])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/ai/analyze-positions')
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/ai/analyze-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisType: 'ON_DEMAND' }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setRecommendations(data.recommendations || [])
        alert(`Analysis completed! Generated ${data.recommendations?.length || 0} recommendations in ${data.executionTime}ms`)
      } else {
        alert(data.error || 'Failed to run analysis')
      }
    } catch (error) {
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
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      case 'INCREASE':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
      case 'REDUCE':
        return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
      default:
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700/50">
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Brain className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                  AI Recommendations
                </h1>
                <p className="text-gray-600 dark:text-gray-300">AI-powered exit strategy suggestions for your positions</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <ThemeToggle />
              <Button onClick={runAnalysis} disabled={analyzing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                {analyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {recommendations.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Brain className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No AI Recommendations Yet</h3>
              <p className="text-gray-600 mb-6">
                Run an AI analysis to get personalized exit strategy recommendations for your positions.
              </p>
              <Button onClick={runAnalysis} disabled={analyzing}>
                <Brain className="h-4 w-4 mr-2" />
                {analyzing ? 'Analyzing...' : 'Start AI Analysis'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>
                  Latest AI analysis results for your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {recommendations.filter(r => r.recommendationType === 'EXIT').length}
                    </div>
                    <div className="text-sm text-gray-600">Exit Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {recommendations.filter(r => r.recommendationType === 'HOLD').length}
                    </div>
                    <div className="text-sm text-gray-600">Hold Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {recommendations.filter(r => r.recommendationType === 'REDUCE').length}
                    </div>
                    <div className="text-sm text-gray-600">Reduce Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {recommendations.filter(r => r.recommendationType === 'INCREASE').length}
                    </div>
                    <div className="text-sm text-gray-600">Increase Recommendations</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations List */}
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <Card key={rec.id} className={`${getRecommendationColor(rec.recommendationType)} border-l-4`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
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
                        <span className="text-sm text-gray-600">
                          {Math.round(rec.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Position Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg">
                      <div>
                        <div className="text-sm text-gray-600">Quantity</div>
                        <div className="font-semibold">{rec.position.quantity}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Current Price</div>
                        <div className="font-semibold">${rec.position.currentPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">P/L</div>
                        <div className={`font-semibold ${rec.position.pnl >= 0 ? 'profit' : 'loss'}`}>
                          ${rec.position.pnl.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">P/L %</div>
                        <div className={`font-semibold ${rec.position.pnlPercent >= 0 ? 'profit' : 'loss'}`}>
                          {rec.position.pnlPercent >= 0 ? '+' : ''}{rec.position.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div>
                      <h4 className="font-semibold mb-2">AI Analysis</h4>
                      <p className="text-gray-700 mb-3">{rec.reasoning}</p>
                    </div>

                    {/* Suggested Action */}
                    <div>
                      <h4 className="font-semibold mb-2">Suggested Action</h4>
                      <p className="text-gray-700 mb-3">{rec.suggestedAction}</p>
                    </div>

                    {/* Price Targets */}
                    {(rec.targetPrice || rec.stopLoss) && (
                      <div className="grid grid-cols-2 gap-4">
                        {rec.targetPrice && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-sm text-green-600 font-medium">Target Price</div>
                            <div className="text-lg font-bold text-green-700">${rec.targetPrice.toFixed(2)}</div>
                          </div>
                        )}
                        {rec.stopLoss && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="text-sm text-red-600 font-medium">Stop Loss</div>
                            <div className="text-lg font-bold text-red-700">${rec.stopLoss.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feedback */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
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
