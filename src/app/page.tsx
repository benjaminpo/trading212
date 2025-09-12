'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Shield, Smartphone, BarChart3, Zap, Target, Brain, Star } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (session) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg dark:shadow-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)'
                }}
              >
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading212 Extra</h1>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Link href="/auth/signin">
                <Button variant="outline" className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button 
                  className="text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0"
                  style={{
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)'
                  }}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/10 dark:to-purple-950/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              AI-Powered Trading Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-tight">
              Advanced Trading212
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent"> Management</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Take control of your Trading212 account with <strong className="text-blue-600 dark:text-blue-400">AI-powered exit strategies</strong>, 
              automated trail stop loss orders, comprehensive P/L analytics, and mobile-first design.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/auth/signup">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto text-white border-0"
                  style={{
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <Star className="w-5 h-5 mr-2" />
                  Start Trading Smarter
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" size="lg" className="text-lg px-10 py-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              <div className="text-center group">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">AI</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Powered</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-200">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitoring</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200">Real-time</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analytics</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-200">Mobile</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">First</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to manage your trades
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Professional-grade tools designed for serious traders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 dark:shadow-2xl">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-700 transition-colors duration-300">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">AI Exit Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                AI-powered recommendations for optimal exit strategies based on advanced market analysis and machine learning
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 dark:shadow-2xl">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-2xl flex items-center justify-center group-hover:bg-green-700 transition-colors duration-300">
                <Target className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Trail Stop Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Automated trailing stop loss orders to protect your profits and limit losses with intelligent risk management
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 dark:shadow-2xl">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-700 transition-colors duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">P/L Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Comprehensive profit and loss analysis with interactive charts for daily, monthly, and yearly performance tracking
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 dark:shadow-2xl">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-700 transition-colors duration-300">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Mobile Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Built with Capacitor for native mobile experience on iOS and Android with offline capabilities
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Features Section */}
      <div className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Trading212 Extra?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built by traders, for traders. Our platform combines cutting-edge AI technology with intuitive design to give you the edge in today&apos;s markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Real-time data processing and instant trade execution. Never miss an opportunity with our optimized platform.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bank-Grade Security</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your data and trades are protected with enterprise-level security measures and encryption protocols.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI-Powered Insights</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Advanced machine learning algorithms analyze market patterns to provide personalized trading recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Join thousands of successful traders who rely on our platform
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">$50M+</div>
              <div className="text-gray-600 dark:text-gray-400">Volume Traded</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">99.9%</div>
              <div className="text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div 
        className="relative text-white py-24 overflow-hidden"
        style={{
          background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #1e40af)'
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Ready to take your trading to the 
            <span className="text-yellow-300"> next level?</span>
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90 leading-relaxed max-w-2xl mx-auto">
            Join thousands of traders who trust Trading212 Extra for their portfolio management and AI-powered insights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border-0"
                style={{
                  background: 'white',
                  color: '#3b82f6'
                }}
              >
                <Star className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-4 font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Trading212 Extra</h3>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Professional trading tools for the modern investor. Powered by AI, designed for success. Take control of your trading journey with intelligent automation and real-time analytics.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                  <span className="text-sm font-bold">X</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                  <span className="text-sm font-bold">Li</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors">
                  <span className="text-sm font-bold">Gh</span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">AI Exit Strategies</li>
                <li className="hover:text-white transition-colors cursor-pointer">Trail Stop Loss</li>
                <li className="hover:text-white transition-colors cursor-pointer">P/L Analytics</li>
                <li className="hover:text-white transition-colors cursor-pointer">Mobile App</li>
                <li className="hover:text-white transition-colors cursor-pointer">Real-time Data</li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-white transition-colors cursor-pointer">API Documentation</li>
                <li className="hover:text-white transition-colors cursor-pointer">Contact Support</li>
                <li className="hover:text-white transition-colors cursor-pointer">Community</li>
                <li className="hover:text-white transition-colors cursor-pointer">Status Page</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 mb-4 md:mb-0">
                © 2024 Trading212 Extra. Built with Next.js, React, and AI.
              </p>
              <div className="flex space-x-6 text-gray-400 text-sm">
                <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
                <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
                <span className="hover:text-white transition-colors cursor-pointer">Cookie Policy</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}